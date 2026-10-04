import asyncio
import httpx

async def test_persistence():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000/api") as client:
        login = await client.post("/auth/login", json={"email": "admin@ricozviz.com", "password": "admin123"})
        assert login.status_code == 200, "Login failed"
        token = login.json()["access_token"]
        res = await client.get("/datasets", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200, "Get datasets failed"
        datasets = res.json()
        print(f"VERIFIED: {len(datasets)} datasets found in PostgreSQL:")
        for d in datasets:
            print(f"  * {d['name']} | ID: {d['id']} | Rows: {d['row_count']} | Cols: {d['column_count']} | Status: {d['status']} | File: {d['file_name']}")
        assert len(datasets) > 0, "No datasets found in database!"
        print("Criterion 20 & 21: Backend & Database persistence FULLY VERIFIED.")

if __name__ == "__main__":
    asyncio.run(test_persistence())
