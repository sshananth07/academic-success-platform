import json
from typing import AsyncGenerator

from google import genai
from google.genai import types

from app.config import settings

client = genai.Client(
    api_key=settings.GEMINI_API_KEY,
    http_options=types.HttpOptions(api_version="v1beta"),
)

embedding_client = genai.Client(
    api_key=settings.GEMINI_API_KEY,
    http_options=types.HttpOptions(api_version="v1"),
)


class AIService:
    MODEL = "gemini-3.1-flash-lite"
    EMBEDDING_MODEL = "gemini-embedding-2"

    @staticmethod
    async def generate_structured(system_prompt: str, user_message: str) -> dict:
        response = await client.aio.models.generate_content(
            model=AIService.MODEL,
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                max_output_tokens=8192,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
        return json.loads(response.text)

    @staticmethod
    async def generate_chat(system_prompt: str, history: list[dict], user_message: str) -> str:
        chat = client.aio.chats.create(
            model=AIService.MODEL,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=8192,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
            history=[
                types.Content(role=msg["role"], parts=[types.Part(text=msg["content"])])
                for msg in history
            ],
        )
        response = await chat.send_message(user_message)
        return response.text

    @staticmethod
    async def generate_chat_stream(
        system_prompt: str, history: list[dict], user_message: str
    ) -> AsyncGenerator[str, None]:
        chat = client.aio.chats.create(
            model=AIService.MODEL,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=8192,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
            history=[
                types.Content(role=msg["role"], parts=[types.Part(text=msg["content"])])
                for msg in history
            ],
        )
        async for chunk in await chat.send_message_stream(user_message):
            if chunk.text:
                yield chunk.text

    @staticmethod
    async def embed_text(text: str) -> list[float]:
        response = embedding_client.models.embed_content(
            model=AIService.EMBEDDING_MODEL,
            contents=text,
            config=types.EmbedContentConfig(
                output_dimensionality=768
            )
        )
        return response.embeddings[0].values
