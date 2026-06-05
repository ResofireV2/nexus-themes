defmodule NexusThemes.Migrations.V1CreateThemes do
  use Ecto.Migration

  def change do
    create table(:theme_showcase_themes) do
      add :name,            :string,  null: false
      add :author,          :string
      add :description,     :text
      add :mode,            :string,  null: false, default: "dark"
      add :status,          :string,  null: false, default: "draft"
      add :css_vars,        :map,     null: false, default: %{}
      add :stylesheet_path, :string
      add :thumbnail_path,  :string
      add :github_repo,     :string
      add :sort_order,      :integer, null: false, default: 0
      timestamps(type: :utc_datetime)
    end

    create index(:theme_showcase_themes, [:status])
    create index(:theme_showcase_themes, [:sort_order])
  end
end
