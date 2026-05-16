"""Quick test for LLM streaming."""
import asyncio
from app.llm import stream_chat

async def main():
    print("Testing teacher model...")
    chunks = []
    async for c in stream_chat(
        [{"role": "user", "content": "用一句话介绍什么是倒金字塔结构"}],
        role="teacher",
    ):
        chunks.append(c)
        print(c, end="", flush=True)
    print(f"\n\nTotal chunks: {len(chunks)}")
    print("=" * 40)

    print("\nTesting MiniMax (student)...")
    chunks2 = []
    async for c in stream_chat(
        [{"role": "user", "content": "你好"}],
        role="student",
    ):
        chunks2.append(c)
        print(c, end="", flush=True)
    print(f"\n\nTotal chunks: {len(chunks2)}")

if __name__ == "__main__":
    asyncio.run(main())
