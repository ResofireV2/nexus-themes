defmodule NexusThemes.ApiRouter do
  use Plug.Router

  alias NexusThemes.ThemeContext
  alias Nexus.Extensions.Permissions

  plug :match
  plug :dispatch

  @slug "theme-showcase"

  # -------------------------------------------------------------------------
  # Public routes — permission: can_view_themes (default: everyone)
  # -------------------------------------------------------------------------

  # GET /ext/theme-showcase/api/themes
  get "/themes" do
    case Permissions.check(@slug, "can_view_themes", conn.assigns[:current_user]) do
      :ok ->
        themes = ThemeContext.list_published()
        send_json(conn, 200, %{themes: Enum.map(themes, &theme_json/1)})

      :error ->
        send_json(conn, 403, %{error: "Access denied"})
    end
  end

  # -------------------------------------------------------------------------
  # Admin routes — permission: can_manage_themes (default: admin)
  # -------------------------------------------------------------------------

  # GET /ext/theme-showcase/api/admin/themes
  get "/admin/themes" do
    case Permissions.check(@slug, "can_manage_themes", conn.assigns[:current_user]) do
      :ok ->
        themes = ThemeContext.list_all()
        send_json(conn, 200, %{themes: Enum.map(themes, &theme_json/1)})

      :error ->
        send_json(conn, 403, %{error: "Access denied"})
    end
  end

  # POST /ext/theme-showcase/api/admin/themes
  post "/admin/themes" do
    case Permissions.check(@slug, "can_manage_themes", conn.assigns[:current_user]) do
      :ok ->
        params = conn.body_params
        case ThemeContext.create(normalise_params(params)) do
          {:ok, theme} -> send_json(conn, 201, %{theme: theme_json(theme)})
          {:error, cs} -> send_json(conn, 422, %{errors: format_errors(cs)})
        end

      :error ->
        send_json(conn, 403, %{error: "Access denied"})
    end
  end

  # PATCH /ext/theme-showcase/api/admin/themes/:id
  patch "/admin/themes/:id" do
    case Permissions.check(@slug, "can_manage_themes", conn.assigns[:current_user]) do
      :ok ->
        params = conn.body_params
        case ThemeContext.update(id, normalise_params(params)) do
          {:ok, theme}         -> send_json(conn, 200, %{theme: theme_json(theme)})
          {:error, :not_found} -> send_json(conn, 404, %{error: "Theme not found"})
          {:error, cs}         -> send_json(conn, 422, %{errors: format_errors(cs)})
        end

      :error ->
        send_json(conn, 403, %{error: "Access denied"})
    end
  end

  # DELETE /ext/theme-showcase/api/admin/themes/:id
  delete "/admin/themes/:id" do
    case Permissions.check(@slug, "can_manage_themes", conn.assigns[:current_user]) do
      :ok ->
        case ThemeContext.delete(id) do
          :ok                -> send_json(conn, 200, %{ok: true})
          {:error, :not_found} -> send_json(conn, 404, %{error: "Theme not found"})
        end

      :error ->
        send_json(conn, 403, %{error: "Access denied"})
    end
  end

  # POST /ext/theme-showcase/api/admin/themes/fetch-github
  # Fetches a GitHub repo's latest release, extracts theme.json + theme.css,
  # stores the CSS locally, and returns pre-fill data for the admin form.
  post "/admin/themes/fetch-github" do
    case Permissions.check(@slug, "can_manage_themes", conn.assigns[:current_user]) do
      :ok ->
        case conn.body_params do
          %{"url" => url} when is_binary(url) and url != "" ->
            case NexusThemes.GitHubFetcher.fetch(url) do
              {:ok, result}    -> send_json(conn, 200, result)
              {:error, reason} -> send_json(conn, 422, %{error: reason})
            end

          _ ->
            send_json(conn, 400, %{error: "url is required"})
        end

      :error ->
        send_json(conn, 403, %{error: "Access denied"})
    end
  end

  match _ do
    send_json(conn, 404, %{error: "Not found"})
  end

  # -------------------------------------------------------------------------
  # Serializers
  # -------------------------------------------------------------------------

  defp theme_json(t) do
    %{
      id:               t.id,
      name:             t.name,
      author:           t.author,
      description:      t.description,
      mode:             t.mode,
      status:           t.status,
      css_vars:         t.css_vars,
      stylesheet_url:   stylesheet_url(t.stylesheet_path),
      script_url:       script_url(t.script_path),
      thumbnail_url:    thumbnail_url(t.thumbnail_path),
      github_repo:      t.github_repo,
      sort_order:       t.sort_order,
      inserted_at:      t.inserted_at
    }
  end

  # Normalise form params before passing to the changeset.
  # The JS sends stylesheet_url and thumbnail_path directly.
  # stylesheet_url maps to stylesheet_path.
  # thumbnail_path is the full /uploads/... URL stored as-is (serialiser handles it).
  defp normalise_params(params) do
    params
    |> then(fn p ->
      case p["stylesheet_url"] do
        nil -> p
        url -> Map.put(p, "stylesheet_path", url)
      end
    end)
    |> then(fn p ->
      case p["script_url"] do
        nil -> p
        url -> Map.put(p, "script_path", url)
      end
    end)
    |> Map.drop(["stylesheet_url", "thumbnail_url", "script_url"])
  end
  defp stylesheet_url(nil), do: nil
  defp stylesheet_url(path) do
    cond do
      # Already a full external URL
      String.starts_with?(path, "http://") or String.starts_with?(path, "https://") ->
        path
      # Already an absolute local path (stored before normalise_params was in place)
      String.starts_with?(path, "/") ->
        path
      # Relative path — construct the full URL via Storage
      true ->
        Nexus.Extensions.Storage.url("theme-showcase", path)
    end
  end

  defp script_url(nil), do: nil
  defp script_url(path) do
    cond do
      String.starts_with?(path, "http://") or String.starts_with?(path, "https://") ->
        path
      String.starts_with?(path, "/") ->
        path
      true ->
        Nexus.Extensions.Storage.url("theme-showcase", path)
    end
  end

  defp thumbnail_url(nil),  do: nil
  defp thumbnail_url(path) do
    cond do
      # Full external URL
      String.starts_with?(path, "http://") or String.starts_with?(path, "https://") ->
        path
      # Absolute local path stored directly (e.g. /uploads/webp/extensions/...)
      String.starts_with?(path, "/") ->
        path
      # Relative path — construct via Storage
      true ->
        Nexus.Extensions.Storage.url("theme-showcase", path)
    end
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {k, v}, acc ->
        String.replace(acc, "%{#{k}}", if(is_binary(v), do: v, else: inspect(v)))
      end)
    end)
  end

  defp send_json(conn, status, body) do
    conn
    |> Plug.Conn.put_resp_content_type("application/json")
    |> Plug.Conn.send_resp(status, Jason.encode!(body))
  end
end
