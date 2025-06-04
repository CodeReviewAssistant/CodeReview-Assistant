from fastapi import FastAPI, HTTPException, APIRouter
from pydantic import BaseModel
import requests
from fastapi.middleware.cors import CORSMiddleware
import os


router = APIRouter()
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
API_KEY = os.getenv("API_KEY")
API_HEADER=os.getenv("API_HEADER")
API_URL = "{API_HEADER}{API_KEY}"

class CodeInput(BaseModel):
    code_snippet: str

@router.post("/model")
async def review_code(input_data: CodeInput):
    prompt = f"""
    


You are a professional Code Review Assistant trained on industry-standard practices. Your task is to perform a **comprehensive and formal code analysis**. Specifically:

1. **Error Identification**
   - Detect and explain any **syntax errors**, **logical bugs**, or **runtime exceptions**.
   - Ensure proper **exception handling** and highlight missing validations.

2. **Best Practices Compliance**
   - Identify violations of **language-specific conventions** (e.g., PEP 8, Java Code Conventions, etc.).
   - Flag any **poor naming**, **magic numbers**, or missing **documentation/comments**.
   - Verify use of appropriate **code structure**, **modularity**, and **readability**.

3. **Security and Performance**
   - Flag any **insecure patterns**, such as unsanitized inputs or hardcoded secrets.
   - Recommend **performance optimizations** where applicable (avoid premature optimization).
   - Ensure usage of efficient **data structures and algorithms**.

4. **Refactoring and Recommendations**
   - Suggest **refactored code snippets** to improve clarity, maintainability, and compliance with the relevant **style guide**.
   - Recommend appropriate **testing frameworks**, **static analysis tools**, and **code documentation practices**.

5. **Formatting and Output**
   - Ensure all output is **clear**, **structured**, and **concise**.
   - Present actionable suggestions in bullet-point format or code blocks.
   - Reference specific conventions or tools where appropriate (e.g., "Use `black` for formatting").



    ```
    {input_data.code_snippet}
    ```
    
    
    """

    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }

    
    response = requests.post(API_URL, json=payload, headers={"Content-Type": "application/json"})
    
    
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=f"API Error: {response.text}")

    
    review_text = response.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "No response received.")
    

    return {"review": review_text}


app.include_router(router)
