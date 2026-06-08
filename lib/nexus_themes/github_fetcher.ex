defmodule NexusThemes.GitHubFetcher do
  @moduledoc """
  Fetches a theme's latest GitHub release, extracts theme.json and theme.css
  from the tarball, stores theme.css under the extension's storage directory,
  and returns pre-fill data for the admin form.

  Reuses the same tarball download/extraction pattern as Nexus.Themes.ThemeLoader
  and relies on the same GitHub token from admin integrations settings.
  """

  require Logger

  @build_base "/tmp/nexus_theme_showcase_build"
  @slug       "theme-showcase"

  @doc """
  Fetches a GitHub repo URL, downloads the latest release tarball, extracts
  theme.json and theme.css, stores theme.css locally, and returns a map
  suitable for pre-filling the admin form.

  Returns:
    {:ok, %{name, author, description, mode, css_vars, stylesheet_path, github_repo}}
    {:error, reason}
  """
  def fetch(url) do
    with {:ok, repo}    <- parse_repo(url),
         {:ok, release} <- fetch_latest_release(repo),
         build_dir      =  build_dir_for(repo),
         :ok            <- download_and_extract(release.tarball_url, build_dir),
         {:ok, meta}    <- read_theme_json(build_dir),
         {:ok, css_path}<- store_theme_css(build_dir, repo) do
      File.rm_rf(build_dir)
      {:ok, %{
        name:            meta["name"],
        author:          meta["author"],
        description:     meta["description"],
        mode:            infer_mode(meta),
        css_vars:        meta["variables"] || meta["css_vars"] || %{},
        stylesheet_url:  stylesheet_url(css_path),
        github_repo:     repo
      }}
    else
      {:error, reason} ->
        {:error, reason}
    end
  end

  # ---------------------------------------------------------------------------
  # Private
  # ---------------------------------------------------------------------------

  defp parse_repo(url) do
    case Nexus.Extensions.GitHub.repo_from_url(url) do
      nil  -> {:error, "Not a valid GitHub URL"}
      repo -> {:ok, repo}
    end
  end

  defp fetch_latest_release(repo) do
    token = Nexus.Extensions.GitHub.get_token()
    case Nexus.Extensions.GitHub.latest_release(repo, token) do
      {:ok, release}      -> {:ok, release}
      {:error, :no_release} -> {:error, "No release found for #{repo}"}
      {:error, reason}    -> {:error, "Could not fetch release: #{inspect(reason)}"}
    end
  end

  defp build_dir_for(repo) do
    safe = String.replace(repo, "/", "_")
    Path.join(@build_base, safe)
  end

  # Download and extract — same pattern as ThemeLoader.download_and_extract/4
  defp download_and_extract(tarball_url, build_dir) do
    File.rm_rf(build_dir)
    File.mkdir_p!(build_dir)

    token   = Nexus.Extensions.GitHub.get_token()
    is_api  = String.contains?(tarball_url, "api.github.com")
    headers = if is_api, do: [], else: [{"Accept", "application/octet-stream"}]
    headers = if token, do: [{"Authorization", "Bearer #{token}"} | headers], else: headers

    case Req.get(tarball_url,
           headers:         headers,
           receive_timeout: 60_000,
           decode_body:     false,
           redirect:        true) do
      {:ok, %{status: 200, body: body}} ->
        tarball = Path.join(build_dir, "release.tar.gz")
        with :ok <- File.write(tarball, body),
             :ok <- extract_tarball(tarball, build_dir) do
          :ok
        end

      {:ok, %{status: status}} ->
        {:error, "Failed to download theme: HTTP #{status}"}

      {:error, reason} ->
        {:error, "Network error: #{inspect(reason)}"}
    end
  end

  # Strip the GitHub top-level directory — same pattern as ThemeLoader
  defp extract_tarball(tarball_path, build_dir) do
    case :erl_tar.extract(
           String.to_charlist(tarball_path),
           [:compressed, {:cwd, String.to_charlist(build_dir)}]) do
      :ok ->
        File.rm(tarball_path)
        case File.ls!(build_dir) do
          [single_dir] ->
            top = Path.join(build_dir, single_dir)
            if File.dir?(top) do
              File.ls!(top)
              |> Enum.each(fn e ->
                File.rename(Path.join(top, e), Path.join(build_dir, e))
              end)
              File.rmdir(top)
            end
          _ -> :ok
        end
        :ok

      {:error, reason} ->
        {:error, "Extraction failed: #{inspect(reason)}"}
    end
  end

  defp read_theme_json(build_dir) do
    path = Path.join(build_dir, "theme.json")
    unless File.exists?(path) do
      {:error, "theme.json not found in release tarball"}
    else
      with {:ok, raw} <- File.read(path),
           {:ok, map} <- Jason.decode(raw) do
        {:ok, map}
      else
        {:error, %Jason.DecodeError{} = e} ->
          {:error, "theme.json parse error: #{Exception.message(e)}"}
        err ->
          err
      end
    end
  end

  # Store theme.css under the extension's storage directory.
  # Returns {:ok, relative_path} or {:ok, nil} if no CSS file present.
  defp store_theme_css(build_dir, repo) do
    src = Path.join(build_dir, "theme.css")
    unless File.exists?(src) do
      {:ok, nil}
    else
      # Use a subdirectory per repo slug to avoid collisions between themes
      repo_slug = repo |> String.split("/") |> List.last() |> String.downcase()
      subdir    = "themes/#{repo_slug}"
      :ok       = Nexus.Extensions.Storage.ensure_dir(@slug, subdir)
      dest_rel  = "#{subdir}/theme.css"
      dest_abs  = Nexus.Extensions.Storage.path(@slug, dest_rel)

      case File.cp(src, dest_abs) do
        :ok  -> {:ok, dest_rel}
        err  -> err
      end
    end
  end

  # Infer mode from theme.json "modes" key if present, otherwise default dark
  defp infer_mode(%{"modes" => modes}) when is_map(modes) do
    has_dark  = Map.has_key?(modes, "dark")
    has_light = Map.has_key?(modes, "light")
    cond do
      has_dark and has_light -> "both"
      has_light              -> "light"
      true                   -> "dark"
    end
  end
  defp infer_mode(_), do: "dark"

  defp stylesheet_url(nil), do: nil
  defp stylesheet_url(rel_path),
    do: Nexus.Extensions.Storage.url(@slug, rel_path)
end
