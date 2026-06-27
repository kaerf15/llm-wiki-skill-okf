#!/usr/bin/env python3
import importlib.util
import sys
import tempfile
import types
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("import_source.py")


def load_module():
    spec = importlib.util.spec_from_file_location("import_source", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class ImportSourceTest(unittest.TestCase):
    def setUp(self):
        self.module = load_module()

    def test_slugifies_titles_for_safe_raw_filenames(self):
        self.assertEqual(
            self.module.slugify("A Paper: RAG vs. Wiki!"),
            "a-paper-rag-vs-wiki",
        )

    def test_infers_destination_subfolder_from_file_extension(self):
        self.assertEqual(self.module.infer_kind(Path("paper.pdf")), "papers")
        self.assertEqual(self.module.infer_kind(Path("deck.pptx")), "notes")
        self.assertEqual(self.module.infer_kind(Path("page.html")), "articles")

    def test_imports_file_with_markitdown_and_frontmatter(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / "wiki-root"
            source = Path(td) / "Source File.pdf"
            root.mkdir()
            source.write_text("fake pdf bytes", encoding="utf-8")

            fake_markitdown = types.ModuleType("markitdown")

            class FakeResult:
                text_content = "# Converted\n\nBody"

            class FakeMarkItDown:
                def convert(self, path):
                    self.path = path
                    return FakeResult()

            fake_markitdown.MarkItDown = FakeMarkItDown
            old_module = sys.modules.get("markitdown")
            sys.modules["markitdown"] = fake_markitdown
            try:
                out_path = self.module.import_source(
                    source,
                    root,
                    kind="papers",
                    title="Custom Title",
                )
            finally:
                if old_module is None:
                    sys.modules.pop("markitdown", None)
                else:
                    sys.modules["markitdown"] = old_module

            self.assertEqual(
                out_path,
                root.resolve() / "raw" / "papers" / "custom-title.md",
            )
            text = out_path.read_text(encoding="utf-8")
            self.assertIn('title: "Custom Title"', text)
            self.assertIn("type: Reference", text)
            self.assertIn("resource:", text)
            self.assertIn("converted_by: markitdown", text)
            self.assertIn("# Converted\n\nBody", text)


if __name__ == "__main__":
    unittest.main()
