"""
Unit tests for RAG metadata extraction and chunking.
"""
import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.rag import (
    _extract_week_number,
    _classify_doc_type,
    load_and_chunk_documents,
)


class TestExtractWeekNumber:
    def test_week_number_basic(self):
        assert _extract_week_number("第3周PPT-提示词工程基础.md") == "Week3"
        assert _extract_week_number("第11周讲稿-Deepfake伦理.md") == "Week11"
        assert _extract_week_number("第1周-课程导论.md") == "Week1"

    def test_week_number_double_digit(self):
        assert _extract_week_number("第16周-期末总结.md") == "Week16"

    def test_week_number_no_match(self):
        assert _extract_week_number("CRISPE框架说明.md") == "General"
        assert _extract_week_number("B1_AI发展简史.md") == "General"
        assert _extract_week_number("教学大纲.md") == "General"

    def test_week_number_edge_cases(self):
        assert _extract_week_number("第0周-预备课.md") == "Week0"
        assert _extract_week_number("第99周-测试.md") == "Week99"


class TestClassifyDocType:
    def test_slide_type(self):
        assert _classify_doc_type("第3周PPT-提示词工程基础.md") == "slide"
        assert _classify_doc_type("Week5-PPT.md") == "slide"
        assert _classify_doc_type("课件PPT-导论.md") == "slide"

    def test_lecture_script_type(self):
        assert _classify_doc_type("第3周讲稿-提示词工程.md") == "lecture_script"
        assert _classify_doc_type("B1_AI发展简史.md") == "lecture_script"
        assert _classify_doc_type("A2_课程导论.md") == "lecture_script"

    def test_syllabus_type(self):
        assert _classify_doc_type("教学大纲.md") == "syllabus"
        assert _classify_doc_type("课程大纲-2024.md") == "syllabus"
        assert _classify_doc_type("教学计划.md") == "syllabus"

    def test_application_type(self):
        assert _classify_doc_type("课程申报书.md") == "application"
        assert _classify_doc_type("项目申请书.md") == "application"

    def test_obe_matrix_type(self):
        assert _classify_doc_type("OBE矩阵-知识点.md") == "obe_matrix"
        assert _classify_doc_type("课程矩阵.md") == "obe_matrix"

    def test_default_document_type(self):
        assert _classify_doc_type("CRISPE框架说明.md") == "document"
        assert _classify_doc_type("课程笔记.md") == "document"


class TestChunkingMetadata:
    def test_chunk_preserves_metadata(self, tmp_path):
        test_file = tmp_path / "第3周PPT-测试.md"
        test_content = "# 测试标题\n\n" + "这是测试内容。" * 100
        test_file.write_text(test_content, encoding="utf-8")

        documents = load_and_chunk_documents(corpus_dir=tmp_path)

        assert len(documents) > 0

        for doc in documents:
            assert "text" in doc
            assert "metadata" in doc
            meta = doc["metadata"]
            assert meta["week"] == "Week3"
            assert meta["filename"] == "第3周PPT-测试.md"
            assert meta["doc_type"] == "slide"
            assert "chunk_index" in meta
            assert "total_chunks" in meta

    def test_chunk_index_consistency(self, tmp_path):
        test_file = tmp_path / "第5周讲稿-长文本.md"
        test_content = "\n\n".join([f"## 第{i}节\n\n{'内容' * 50}" for i in range(10)])
        test_file.write_text(test_content, encoding="utf-8")

        documents = load_and_chunk_documents(corpus_dir=tmp_path)

        total_chunks = documents[0]["metadata"]["total_chunks"]
        assert total_chunks == len(documents)

        chunk_indices = [doc["metadata"]["chunk_index"] for doc in documents]
        assert chunk_indices == list(range(total_chunks))

    def test_empty_corpus_returns_empty_list(self, tmp_path):
        documents = load_and_chunk_documents(corpus_dir=tmp_path)
        assert documents == []

    def test_short_files_skipped(self, tmp_path):
        short_file = tmp_path / "短文件.md"
        short_file.write_text("太短了", encoding="utf-8")

        documents = load_and_chunk_documents(corpus_dir=tmp_path)
        assert len(documents) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
