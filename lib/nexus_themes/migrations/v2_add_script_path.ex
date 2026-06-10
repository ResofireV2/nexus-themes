defmodule NexusThemes.Migrations.V2AddScriptPath do
  use Ecto.Migration

  def change do
    alter table(:theme_showcase_themes) do
      add_if_not_exists :script_path, :string
    end
  end
end
