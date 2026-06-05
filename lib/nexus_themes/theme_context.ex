defmodule NexusThemes.ThemeContext do
  import Ecto.Query
  alias Nexus.Repo
  alias NexusThemes.Theme

  @doc "Returns all themes regardless of status, ordered by inserted_at desc (latest first)."
  def list_all do
    from(t in Theme, order_by: [desc: t.inserted_at])
    |> Repo.all()
  end

  @doc "Returns only published themes, ordered by inserted_at desc (latest first)."
  def list_published do
    from(t in Theme,
      where: t.status == "published",
      order_by: [desc: t.inserted_at]
    )
    |> Repo.all()
  end

  def get(id) do
    case Repo.get(Theme, id) do
      nil   -> {:error, :not_found}
      theme -> {:ok, theme}
    end
  end

  def create(attrs) do
    %Theme{}
    |> Theme.changeset(attrs)
    |> Repo.insert()
  end

  def update(id, attrs) do
    case Repo.get(Theme, id) do
      nil   -> {:error, :not_found}
      theme ->
        theme
        |> Theme.changeset(attrs)
        |> Repo.update()
    end
  end

  def delete(id) do
    case Repo.get(Theme, id) do
      nil   -> {:error, :not_found}
      theme ->
        # Clean up stored files before removing the DB row
        delete_file_if_present(theme.stylesheet_path)
        delete_file_if_present(theme.thumbnail_path)
        Repo.delete(theme)
        :ok
    end
  end

  # ---------------------------------------------------------------------------
  # Private
  # ---------------------------------------------------------------------------

  defp delete_file_if_present(nil), do: :ok
  defp delete_file_if_present(path) do
    abs = Nexus.Extensions.Storage.path("theme-showcase", path)
    File.rm(abs)
    :ok
  end
end
