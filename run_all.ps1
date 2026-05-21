# 1. Setup Backend
cd "d:\@codes\New folder (11)\our_backend"

# Ensure venv exists
if (-Not (Test-Path ".venv")) {
    python -m venv .venv
}

# Activate venv
. .venv\Scripts\activate

# Install dependencies using the blazing-fast uv package manager (already installed on your system)
uv pip install -r requirements.txt

# Verify imports
python -c "import fastapi, uvicorn, supabase, httpx, sklearn, pandas; print('✅ Backend dependencies installed successfully')"

# Run Backend in a new window
Write-Host "Starting Backend..."
Start-Process powershell -ArgumentList "-NoExit -Command `"cd 'd:\@codes\New folder (11)\our_backend'; . .venv\Scripts\activate; uvicorn main:socket_app --port 8080 --reload`""

# 2. Setup and Start Frontend
cd "d:\@codes\New folder (11)\frontend"
npm install
Start-Process powershell -ArgumentList "-NoExit -Command `"cd 'd:\@codes\New folder (11)\frontend'; npm run dev`""

Write-Host "✅ Both servers are starting in new windows." -ForegroundColor Green
