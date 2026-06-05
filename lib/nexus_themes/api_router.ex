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
        {:ok, body, conn} = Plug.Conn.read_body(conn)

        case Jason.decode(body) do
          {:ok, params} ->
            case ThemeContext.create(params) do
              {:ok, theme}      -> send_json(conn, 201, %{theme: theme_json(theme)})
              {:error, cs}      -> send_json(conn, 422, %{errors: format_errors(cs)})
            end

          {:error, _} ->
            send_json(conn, 400, %{error: "Invalid JSON"})
        end

      :error ->
        send_json(conn, 403, %{error: "Access denied"})
    end
  end

  # PATCH /ext/theme-showcase/api/admin/themes/:id
  patch "/admin/themes/:id" do
    case Permissions.check(@slug, "can_manage_themes", conn.assigns[:current_user]) do
      :ok ->
        {:ok, body, conn} = Plug.Conn.read_body(conn)

        case Jason.decode(body) do
          {:ok, params} ->
            case ThemeContext.update(id, params) do
              {:ok, theme}       -> send_json(conn, 200, %{theme: theme_json(theme)})
              {:error, :not_found} -> send_json(conn, 404, %{error: "Theme not found"})
              {:error, cs}       -> send_json(conn, 422, %{errors: format_errors(cs)})
            end

          {:error, _} ->
            send_json(conn, 400, %{error: "Invalid JSON"})
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
        {:ok, body, conn} = Plug.Conn.read_body(conn)

        case Jason.decode(body) do
          {:ok, %{"url" => url}} ->
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
      thumbnail_url:    thumbnail_url(t.thumbnail_path),
      github_repo:      t.github_repo,
      sort_order:       t.sort_order,
      inserted_at:      t.inserted_at
    }
  end

  defp stylesheet_url(nil),  do: nil
  defp stylesheet_url(path), do: Nexus.Extensions.Storage.url("theme-showcase", path)

  defp thumbnail_url(nil),   do: nil
  defp thumbnail_url(path),  do: Nexus.Extensions.Storage.url("theme-showcase", path)

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
