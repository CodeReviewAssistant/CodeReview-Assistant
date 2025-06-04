import os
import requests
from typing import Optional
import dotenv
from fastapi import HTTPException
from enum import Enum
import re
from fastapi import FastAPI, APIRouter
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

dotenv.load_dotenv(override=True)

import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

API_KEY=os.getenv("API_KEY")
API_HEADER=os.getenv("API_HEADER")
class LLM:
    def __init__(self):
        self.api_header=API_HEADER
        self.api_key = API_KEY
        if not self.api_key:
            raise ValueError("MODEL_API_KEY is missing. Please ensure it's set.")

        self.api_url = f"{self.api_header}{self.api_key}"
        self.headers = {
            "Content-Type": "application/json",
        }

    def _build_prompt(self, code_snippet: str, original_code: Optional[str] = None) -> str:
        code_section_header = ""
        code_content_for_prompt = ""

        if original_code:
            code_section_header = "### Code Analysis (Original vs. Changed):"
            code_content_for_prompt = f"### Original Code:\n```\n{original_code}\n```\n\n### Changed Code / New Code:\n```\n{code_snippet}\n```"
        else:
            code_section_header = "### Code or Query:"
            code_content_for_prompt = f"```\n{code_snippet}\n```"


        prompt = f"""### If the provided input below is a greeting (e.g., "Hello", "Hi Assistant"), respond with an appropriate greeting. Otherwise, skip pleasantries and proceed directly to a structured code review.

### Instructions:
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

{code_section_header}
{code_content_for_prompt}

### RESPONSE:
"""
        return prompt

    def _get_llm_response(self, prompt: str):
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
        }

        try:
            response = requests.post(self.api_url, headers=self.headers, json=payload, verify=False)
            response.raise_for_status()
            data = response.json()

            candidates = data.get("candidates")
            if not candidates:
                prompt_feedback = data.get("promptFeedback")
                error_detail = f"No candidates found in LLM response. API Response: {data}"
                if prompt_feedback:
                    error_detail += f" | Prompt Feedback: {prompt_feedback}"
                print(f"LLM API Error: {error_detail}")
                raise HTTPException(status_code=500, detail=error_detail)

            first_candidate = candidates[0]
            content = first_candidate.get("content")
            if not content or not content.get("parts"):
                 finish_reason = first_candidate.get("finishReason", "UNKNOWN")
                 safety_ratings = first_candidate.get("safetyRatings", [])
                 error_detail = f"Invalid content structure in LLM response. Finish Reason: {finish_reason}. API Response: {data}"
                 if safety_ratings:
                     error_detail += f" | Safety Ratings: {safety_ratings}"
                 print(f"LLM API Error: {error_detail}")
                 if finish_reason == "SAFETY":
                     raise HTTPException(status_code=400, detail=f"Content blocked due to safety reasons. {error_detail}")
                 raise HTTPException(status_code=500, detail=error_detail)

            response_text_parts = [part.get("text") for part in content["parts"] if "text" in part]
            if not response_text_parts or response_text_parts[0] is None:
                 error_detail = f"No text part found in LLM response content. API Response: {data}"
                 print(f"LLM API Error: {error_detail}")
                 raise HTTPException(status_code=500, detail=error_detail)
            
            response_text = "".join(response_text_parts)
            return response_text

        except requests.exceptions.HTTPError as e:
            error_body = e.response.text
            print(f"Error calling LLM API (HTTPError {e.response.status_code}): {e}. Response body: {error_body}")
            raise HTTPException(status_code=e.response.status_code, detail=f"Error communicating with LLM API: {error_body}")
        except requests.exceptions.RequestException as e:
            print(f"Error calling LLM API (RequestException): {e}")
            raise HTTPException(status_code=502, detail=f"Network error communicating with LLM API: {str(e)}")
        except (KeyError, IndexError, TypeError) as e:
             data_for_error = locals().get('data', 'not available')
             print(f"Error parsing LLM API response: {e}. Response data was: {data_for_error}")
             raise HTTPException(status_code=500, detail="Error parsing LLM API response.")
        except HTTPException:
             raise
        except Exception as e:
             print(f"An unexpected error occurred in _get_llm_response: {e}")
             raise HTTPException(status_code=500, detail="An internal server error occurred.")


    def analyze_source_file(self, changes, file_name):
        prompt = self._build_prompt(code_snippet=changes)
        review_text = self._get_llm_response(prompt)
        return {
            "response": review_text,
            "file_name": file_name
        }

    def analyze_source_and_target_file(self, original_content, changes, file_name):
        prompt = self._build_prompt(code_snippet=changes, original_code=original_content)
        review_text = self._get_llm_response(prompt)
        return {
            "response": review_text,
            "file_name": file_name
        }

class Vulnerability:
    def parse_requirement_line(self, line: str) -> tuple[Optional[str], Optional[str]]:
        line = line.split('#')[0].strip()
        if not line:
            return None, None

        match = re.match(r'^([a-zA-Z0-9_.-]+)', line)
        if not match:
            return None, None 

        package = match.group(1).strip()

        version_match = re.search(r'([=<>~!]=?)\s*([a-zA-Z0-9_.*+-]+)', line)
        version = ""
        if version_match:
            exact_match = re.search(r'==\s*([a-zA-Z0-9_.*+-]+)', line)
            if exact_match:
                 version = exact_match.group(1).strip()
            else:
                 version = version_match.group(2).strip()

        package = package.split('[')[0]
        version = version.split(';')[0].strip()
        version = version.split('#')[0].strip()
        version = version.split(' ')[0].strip()
        
        is_complex_version = any(c in version for c in '<>~!*') if version else False
        if not version or is_complex_version:
             # For now, we are only interested in exact versions for OSV.dev
             # OSV.dev query API works best with exact versions.
             # If version is complex (e.g. >=1.0,<2.0) or empty, we skip for this basic checker
             # A more advanced checker might try to resolve the specific version or query ranges
             if is_complex_version:
                 print(f"Skipping vulnerability check for {package} due to complex version specifier: {line.split(package)[-1].strip()}")
             return package, None # Return package name but no version if it's not exact or empty

        return package, version


    def check_vulnerabilities(self, changes: str) -> dict:
        VULN_API_URL = os.getenv("VULN_API_URL", "https://api.osv.dev/v1/query")
        if not VULN_API_URL:
             print("Warning: VULN_API_URL environment variable not set. Using default OSV URL.")

        markdown_output = "## Vulnerability Report\n\n"
        has_vulnerabilities = False
        checked_packages = 0
        skipped_packages_due_to_version_spec = 0

        for line in changes.splitlines():
            package, version = self.parse_requirement_line(line)
            
            if not package: # Skip empty lines or lines that don't parse to a package
                continue
            
            if not version: # Version was not exact or parsable as an exact version
                skipped_packages_due_to_version_spec +=1
                continue

            checked_packages += 1
            payload = {
                "version": version,
                "package": {
                    "name": package,
                    "ecosystem": "PyPI"
                }
            }

            try:
                response = requests.post(VULN_API_URL, json=payload)
                response.raise_for_status()
                vulns_data = response.json()
                if "vulns" in vulns_data and vulns_data["vulns"]:
                    has_vulnerabilities = True
                    for vuln_entry in vulns_data["vulns"]: # Iterate through all vulns for the package/version
                        vuln_id = vuln_entry.get("id", "N/A")
                        summary = vuln_entry.get("summary", "No summary available.")
                        details = vuln_entry.get("details", "No details provided.")
                        
                        # Try to find a CVE ID from aliases
                        aliases = vuln_entry.get("aliases", [])
                        cve_id = next((alias for alias in aliases if alias.startswith("CVE-")), None)

                        markdown_output += f"### Vulnerability Found: {package} ({version})\n"
                        markdown_output += f"- **OSV ID:** {vuln_id}\n"
                        if cve_id:
                            markdown_output += f"- **CVE ID:** {cve_id}\n"
                        if summary != "No summary available.":
                             markdown_output += f"- **Summary:** {summary}\n"
                        else: # If summary is generic, use details if available
                             markdown_output += f"- **Details:** {details}\n"
                        
                        affected_versions = []
                        for affected in vuln_entry.get("affected", []):
                            if "versions" in affected:
                                affected_versions.extend(affected["versions"])
                        if affected_versions:
                            markdown_output += f"- **Affected Versions (reported by OSV):** {', '.join(affected_versions)}\n"

                        markdown_output += "\n"
                
            except requests.exceptions.RequestException as e:
                markdown_output += f"### Error checking {package} ({version})\n"
                markdown_output += f"- **Error:** Could not connect to vulnerability database ({str(e)})\n\n"
            except Exception as e:
                 markdown_output += f"### Error processing {package} ({version})\n"
                 markdown_output += f"- **Error:** {str(e)}\n\n"

        if checked_packages == 0:
            if skipped_packages_due_to_version_spec > 0:
                markdown_output += f"No package versions could be precisely determined for vulnerability checking. {skipped_packages_due_to_version_spec} packages had complex version specifiers.\n"
            else:
                markdown_output += "No valid package versions found to check in the provided requirements.\n"
        elif not has_vulnerabilities:
            markdown_output += "No known vulnerabilities found in the checked dependencies (for the exact versions specified).\n"
        
        if skipped_packages_due_to_version_spec > 0:
             markdown_output += f"\nNote: {skipped_packages_due_to_version_spec} package(s) were skipped during vulnerability check due to complex version specifiers (e.g., ranges like >=, <=, !=, ~). OSV.dev queries work best with exact versions (e.g., `package==1.2.3`).\n"

        return {"response": markdown_output} 

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"], 
)

llm = LLM()
vuln = Vulnerability()
router = APIRouter()

class RequestTypeEnum(str, Enum):
    ONLY_SOURCE_FILE = "ONLY_SOURCE_FILE"
    SOURCE_AND_TARGET = "SOURCE_AND_TARGET"


class ChatRequest(BaseModel):
    original_content: Optional[str] = None
    changes: str
    request_type: RequestTypeEnum
    file_name: str


@router.get("/test")
def read_root():
    return {"Hello": "World"}


@router.post("/mergechat")
async def chat(request: ChatRequest):
    try:
        if request.file_name == "requirements.txt":
            response_data = vuln.check_vulnerabilities(request.changes)
            response_data["file_name"] = request.file_name
            return response_data

        if request.request_type == RequestTypeEnum.SOURCE_AND_TARGET:
            response = llm.analyze_source_and_target_file(
                request.original_content, request.changes, request.file_name
            )
        else:
            response = llm.analyze_source_file(
                request.changes, request.file_name
            )

        return response

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in /mergechat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {str(e)}")

app.include_router(router)