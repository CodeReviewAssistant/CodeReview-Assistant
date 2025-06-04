from fastapi import FastAPI, HTTPException, APIRouter
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
from accelerate import dispatch_model

MODEL_NAME = "codellama/CodeLlama-7b-Instruct-hf"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, padding_side="left")
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(MODEL_NAME,torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,device_map={"": "cpu"})
dispatch_model(model, offload_to_cpu=True)
router = APIRouter()
# FastAPI app
app = FastAPI()

class CodeInput(BaseModel):
    code_snippet: str

@router.post("/model")
async def review_code(input_data: CodeInput):
    prompt = f"""
    ### Task: Perform a comprehensive code review and debugging analysis.
    ### Instructions:
    - Identify any **syntax errors**, **logical bugs**, or **runtime issues**.
    - Detect **best practice violations**, **security concerns**, and **efficiency improvements**.
    - Suggest **optimized and refactored code** where necessary.
    - Ensure adherence to **language-specific conventions** and industry standards.
    - Provide a **clear, structured, and concise review**.
    
    ### Code:
    ```
    {input_data.code_snippet}
    ```
    
    ### Review:
    """
    
    inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
    output = model.generate(
        inputs["input_ids"],
        max_new_tokens=1024,
        temperature=0.7,
        top_p=0.9,
        do_sample=True,
        repetition_penalty=1.2,
        eos_token_id=tokenizer.eos_token_id
    )
    
    return {"review": tokenizer.decode(output[0], skip_special_tokens=True)}
