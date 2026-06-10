defmodule NexusThemes.Theme do
  use Ecto.Schema
  import Ecto.Changeset

  schema "theme_showcase_themes" do
    field :name,            :string
    field :author,          :string
    field :description,     :string
    field :mode,            :string,  default: "dark"
    field :status,          :string,  default: "draft"
    field :css_vars,        :map,     default: %{}
    field :stylesheet_path, :string
    field :script_path,     :string
    field :thumbnail_path,  :string
    field :github_repo,     :string
    field :sort_order,      :integer, default: 0
    timestamps(type: :utc_datetime)
  end

  @valid_modes   ~w(dark light both)
  @valid_statuses ~w(draft published)

  def changeset(theme, attrs) do
    theme
    |> cast(attrs, [:name, :author, :description, :mode, :status,
                    :css_vars, :stylesheet_path, :script_path, :thumbnail_path,
                    :github_repo, :sort_order])
    |> validate_required([:name, :mode, :status])
    |> validate_inclusion(:mode,   @valid_modes,    message: "must be dark, light, or both")
    |> validate_inclusion(:status, @valid_statuses, message: "must be draft or published")
  end
end
