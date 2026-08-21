package angularwasm

import (
	"strings"
	"testing"
)

type programmaticViewController struct{}

func TestProgrammaticViewManifest(t *testing.T) {
	module := NewNgModule("viewModule").Component(
		NewComponent[programmaticViewController](
			"viewPanel",
			"view-panel",
			"newViewPanel",
			ProgrammaticView("renderViewPanel"),
		),
	)

	manifest, err := module.ManifestJSON()
	if err != nil {
		t.Fatalf("ManifestJSON() error = %v", err)
	}

	if !strings.Contains(manifest, `"view":"renderViewPanel"`) {
		t.Fatalf("manifest does not contain the programmatic view export: %s", manifest)
	}
}

func TestProgrammaticViewIsMutuallyExclusiveWithTemplates(t *testing.T) {
	source := ProgrammaticView("renderView")
	source.inline = "<p>invalid</p>"

	if err := source.Validate(); err == nil {
		t.Fatal("Validate() accepted a view combined with an inline template")
	}
}
