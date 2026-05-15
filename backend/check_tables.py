import asyncio
import httpx
from config import get_settings
settings = get_settings()

async def get_schema():
    headers = {
        'apikey': settings.SUPABASE_KEY,
        'Authorization': f'Bearer {settings.SUPABASE_KEY}'
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(f'{settings.SUPABASE_URL.rstrip("/")}/rest/v1/', headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            tables = data.get('definitions', {}).keys()
            print('--- Supabase Tables and Schemas ---')
            for table in tables:
                print(f'\nTable: {table}')
                properties = data['definitions'][table].get('properties', {})
                for prop, details in properties.items():
                    print(f'  - {prop} ({details.get("type", "unknown")})')
        else:
            print(f'Error fetching schema: {resp.status_code} {resp.text}')

if __name__ == "__main__":
    asyncio.run(get_schema())
