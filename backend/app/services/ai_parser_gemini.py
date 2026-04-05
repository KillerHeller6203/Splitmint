import google.generativeai as genai
import re
import json
from typing import List
from app.core.config import settings
from app.schemas.expense import ParsedExpense
from app.models.expense import SplitMode

async def parse_natural_language_expense(text: str) -> ParsedExpense:
    """
    Parse natural language expense text into structured expense data.
    Examples:
    - "Dinner 1200 split between John and Mary"
    - "Movie tickets 300 split equally among 3 people"
    - "Groceries 2000, I paid, split 50/50 with Sarah"
    """
    
    if not settings.gemini_api_key:
        return fallback_parse_expense(text)
    
    try:
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel('gemini-pro')
        
        prompt = f"""
        Parse the following expense description into structured data:
        "{text}"
        
        Extract:
        - Amount (number only)
        - Description (text without amount)
        - Split mode (equal, custom, percentage)
        - Number of participants (if mentioned)
        
        Respond ONLY with valid JSON format:
        {{
            "amount": 1200,
            "description": "Dinner",
            "split_mode": "equal",
            "participants": 2
        }}
        
        If information is missing, make reasonable assumptions:
        - Default split mode: "equal"
        - If no participant count mentioned, assume 2 people
        - Remove currency symbols and extract only the number
        - Do not include any explanation, only JSON
        """
        
        response = model.generate_content(prompt)
        result = response.text.strip()
        
        # Clean up the response to ensure it's valid JSON
        # Remove any markdown code blocks or extra text
        json_match = re.search(r'\{.*\}', result, re.DOTALL)
        if json_match:
            result = json_match.group(0)
        
        parsed = json.loads(result)
        
        return ParsedExpense(
            amount=float(parsed["amount"]),
            description=parsed["description"],
            participants=list(range(parsed["participants"])),
            split_mode=SplitMode(parsed.get("split_mode", "equal"))
        )
        
    except Exception as e:
        print(f"Gemini parsing failed: {e}")
        return fallback_parse_expense(text)

def fallback_parse_expense(text: str) -> ParsedExpense:
    """
    Fallback parsing using regex when Gemini is not available.
    """
    amount_match = re.search(r'[\$₹€£]?\s*(\d+(?:\.\d{2})?)', text)
    amount = float(amount_match.group(1)) if amount_match else 0.0
    
    description = re.sub(r'[\$₹€£]?\s*\d+(?:\.\d{2})?', '', text).strip()
    
    if "split" in text.lower() and ("equal" in text.lower() or "equally" in text.lower()):
        split_mode = SplitMode.EQUAL
    elif "percentage" in text.lower() or "%" in text:
        split_mode = SplitMode.PERCENTAGE
    else:
        split_mode = SplitMode.EQUAL
    
    participants_match = re.search(r'(\d+)\s*(?:people|person)', text.lower())
    num_participants = int(participants_match.group(1)) if participants_match else 2
    
    return ParsedExpense(
        amount=amount,
        description=description,
        participants=list(range(num_participants)),
        split_mode=split_mode
    )
