"""
Lightweight Supabase REST Client
Replaces SQLAlchemy with direct REST calls to Supabase.
"""
import httpx
import logging
from typing import Optional, Dict, Any, List

from config import get_settings

logger = logging.getLogger("fidelity.supabase")
settings = get_settings()

class SupabaseClient:
    def __init__(self):
        self.base_url = settings.SUPABASE_URL.rstrip('/')
        self.headers = {
            "apikey": settings.SUPABASE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
    async def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        url = f"{self.base_url}/rest/v1/{path}"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.request(method, url, headers=self.headers, **kwargs)
                response.raise_for_status()
                return response
            except httpx.HTTPStatusError as e:
                logger.error(f"[SUPABASE] API Error {e.response.status_code}: {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"[SUPABASE] Request Error: {e}")
                raise

    # ─── Generic CRUD ───
    async def insert(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a row and return the representation."""
        response = await self._request("POST", table, json=data)
        return response.json()[0] if response.json() else {}

    async def insert_many(self, table: str, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        response = await self._request("POST", table, json=data)
        return response.json()

    async def select(self, table: str, params: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        """Select rows with optional query params (e.g. {'id': 'eq.1'})"""
        response = await self._request("GET", table, params=params)
        return response.json()

    async def update(self, table: str, match_params: Dict[str, str], data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Update rows matching params."""
        response = await self._request("PATCH", table, params=match_params, json=data)
        return response.json()

    async def delete(self, table: str, match_params: Dict[str, str]):
        """Delete rows matching params."""
        await self._request("DELETE", table, params=match_params)

# Global client instance
supabase = SupabaseClient()
