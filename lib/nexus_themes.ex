defmodule NexusThemes do
  @moduledoc """
  Theme Showcase extension for Nexus.

  Provides a curated public-facing gallery of Nexus themes with live
  in-browser preview. Admins manage theme entries (including GitHub import)
  through the dedicated admin panel. Visitors browse and preview themes
  without any account required.
  """

  use Nexus.Extensions.Behaviour

  @impl true
  def migrations do
    [
      NexusThemes.Migrations.V1CreateThemes,
      NexusThemes.Migrations.V2AddScriptPath,
    ]
  end

  @impl true
  def routes do
    [{"/", NexusThemes.ApiRouter, []}]
  end

  @impl true
  def on_uninstall do
    # Remove all stored files (theme stylesheets and thumbnails)
    Nexus.Extensions.Storage.delete_all("theme-showcase")
    :ok
  end
end
