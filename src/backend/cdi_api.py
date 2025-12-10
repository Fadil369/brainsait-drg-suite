from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
import asyncio
import json
import time
from datetime import datetime
app = FastAPI(
    title="BrainSAIT CDI Engage One API",
    description="Enhanced real-time Clinical Documentation Integrity (CDI) feedback system with EHR integration for Saudi healthcare market.",
    version="2.0.0"
)

# --- Enhanced Pydantic Models for CDI Engage One ---
class CDINudge(BaseModel):
    id: str = Field(..., description="A unique identifier for the nudge.")
    severity: Literal['info', 'warning', 'critical'] = Field(..., description="The severity level of the documentation gap.")
    prompt: str = Field(..., description="A user-friendly prompt for the physician.")
    suggested_text: Optional[str] = Field(None, description="Optional text to insert.")
    nudge_type: Literal['SPECIFICITY', 'LATERALITY', 'SEVERITY', 'ORGANISM', 'COMPLICATION'] = Field(..., description="Type of documentation improvement needed.")
    clinical_context: str = Field(..., description="Clinical context for the nudge.")
    expected_improvement: Dict[str, float] = Field(default_factory=dict, description="Expected CMI and accuracy improvements.")
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Timestamp when nudge was created.")

class RealTimeAnalyzeRequest(BaseModel):
    encounter_id: str = Field(..., description="The ID of the encounter.")
    physician_id: str = Field(..., description="The ID of the physician.")
    clinical_note: str = Field(..., description="The current draft clinical note text.")
    cursor_position: Optional[int] = Field(None, description="Current cursor position in the text.")
    last_change: Optional[str] = Field(None, description="Last change made to the text.")
    ehr_context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional EHR context.")

class CDIEngageOneSession(BaseModel):
    session_id: str = Field(..., description="Unique session identifier.")
    encounter_id: str = Field(..., description="Associated encounter ID.")
    physician_id: str = Field(..., description="Physician ID.")
    active_nudges: List[CDINudge] = Field(default_factory=list, description="Currently active nudges.")
    documentation_score: float = Field(default=0.0, description="Current documentation quality score.")
    completion_percentage: float = Field(default=0.0, description="Documentation completion percentage.")
    session_start: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Session start time.")
    last_activity: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Last activity timestamp.")

class AnalyzeRequest(BaseModel):
    encounter_id: Optional[str] = Field(None, description="The ID of the encounter, if available.")
    clinical_note: str = Field(..., description="The draft clinical note text.")

class AnalyzeResponse(BaseModel):
    nudges: List[CDINudge]
    summary: str
    documentation_score: float = Field(default=0.0, description="Overall documentation quality score.")
    real_time_suggestions: List[str] = Field(default_factory=list, description="Real-time typing suggestions.")

# --- Enhanced CDI Rules Engine with Saudi Healthcare Context ---
ENHANCED_CDI_RULES = [
    {
        "id": "pneumonia_specificity",
        "keywords": ["pneumonia", "سعال شديد", "pneumonitis"],
        "negation_keywords": ["organism", "bacterial", "viral", "lobar", "atypical", "streptococcus", "pneumococcal"],
        "nudge": {
            "id": "pneumonia_specificity",
            "severity": "warning",
            "prompt": "Consider specifying the causative organism for pneumonia to improve coding specificity and CMI (e.g., bacterial, viral, or specific organism like Streptococcus pneumoniae).",
            "nudge_type": "ORGANISM",
            "clinical_context": "Pneumonia diagnosis requires organism specificity for optimal DRG assignment",
            "expected_improvement": {"cmi_impact": 0.15, "coding_accuracy_impact": 0.12}
        }
    },
    {
        "id": "uti_specificity",
        "keywords": ["urinary tract infection", "uti", "التهاب المسالك البولية"],
        "negation_keywords": ["cystitis", "pyelonephritis", "urosepsis", "catheter-associated", "complicated", "uncomplicated"],
        "nudge": {
            "id": "uti_specificity",
            "severity": "warning",
            "prompt": "Specify the site and type of urinary tract infection (e.g., cystitis, pyelonephritis, catheter-associated UTI) for accurate coding.",
            "nudge_type": "SPECIFICITY",
            "clinical_context": "UTI site specificity affects DRG assignment and severity scoring",
            "expected_improvement": {"cmi_impact": 0.08, "coding_accuracy_impact": 0.18}
        }
    },
    {
        "id": "fracture_laterality",
        "keywords": ["fracture", "كسر", "broken bone", "break"],
        "negation_keywords": ["left", "right", "bilateral", "يسار", "يمين"],
        "nudge": {
            "id": "fracture_laterality",
            "severity": "critical",
            "prompt": "Specify laterality (left, right, or bilateral) for the fracture diagnosis. This is required for accurate ICD-10 coding.",
            "nudge_type": "LATERALITY",
            "clinical_context": "Fracture laterality is mandatory for ICD-10 coding compliance",
            "expected_improvement": {"cmi_impact": 0.05, "coding_accuracy_impact": 0.25}
        }
    },
    {
        "id": "myocardial_infarction_type",
        "keywords": ["myocardial infarction", "heart attack", "mi", "احتشاء عضلة القلب"],
        "negation_keywords": ["stemi", "nstemi", "st-elevation", "non-st-elevation", "anterior", "inferior", "lateral"],
        "nudge": {
            "id": "mi_type_specificity",
            "severity": "critical",
            "prompt": "Specify the type of myocardial infarction (STEMI, NSTEMI) and location (anterior, inferior, lateral) for optimal DRG assignment.",
            "nudge_type": "SEVERITY",
            "clinical_context": "MI type and location significantly impact APR-DRG severity and CMI",
            "expected_improvement": {"cmi_impact": 0.35, "coding_accuracy_impact": 0.28}
        }
    },
    {
        "id": "diabetes_complications",
        "keywords": ["diabetes", "diabetic", "sukari", "السكري"],
        "negation_keywords": ["complications", "nephropathy", "retinopathy", "neuropathy", "ketoacidosis", "hypoglycemia"],
        "nudge": {
            "id": "diabetes_complications",
            "severity": "warning",
            "prompt": "Document any diabetes complications (nephropathy, retinopathy, neuropathy, ketoacidosis) to capture full disease complexity.",
            "nudge_type": "COMPLICATION",
            "clinical_context": "Diabetes complications significantly increase CMI and reflect true patient acuity",
            "expected_improvement": {"cmi_impact": 0.22, "coding_accuracy_impact": 0.15}
        }
    },
    {
        "id": "hypertension_severity",
        "keywords": ["hypertension", "high blood pressure", "ضغط دم مرتفع"],
        "negation_keywords": ["crisis", "emergency", "urgency", "malignant", "controlled", "uncontrolled"],
        "nudge": {
            "id": "hypertension_severity",
            "severity": "info",
            "prompt": "Consider documenting hypertension severity (controlled, uncontrolled, crisis, emergency) for accurate risk stratification.",
            "nudge_type": "SEVERITY",
            "clinical_context": "Hypertension severity affects patient risk assessment and care planning",
            "expected_improvement": {"cmi_impact": 0.08, "coding_accuracy_impact": 0.10}
        }
    }
]

# --- Connection Manager for Real-Time WebSocket Connections ---
class CDIConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.active_sessions: Dict[str, CDIEngageOneSession] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str, encounter_id: str, physician_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        
        # Create new CDI session
        session = CDIEngageOneSession(
            session_id=session_id,
            encounter_id=encounter_id,
            physician_id=physician_id
        )
        self.active_sessions[session_id] = session
        
        # Send welcome message
        await self.send_message(session_id, {
            "type": "session_started",
            "session_id": session_id,
            "message": "CDI Engage One session started. Real-time documentation assistance is active."
        })
    
    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]
    
    async def send_message(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_text(json.dumps(message))
            except:
                # Connection closed, clean up
                self.disconnect(session_id)
    
    async def broadcast_to_session(self, session_id: str, nudges: List[CDINudge], documentation_score: float):
        message = {
            "type": "real_time_nudges",
            "nudges": [nudge.dict() for nudge in nudges],
            "documentation_score": documentation_score,
            "timestamp": datetime.now().isoformat()
        }
        await self.send_message(session_id, message)

# Global connection manager
connection_manager = CDIConnectionManager()
# --- CDI Rules Engine ---
# A simple, deterministic ruleset for identifying common documentation gaps.
# In a real system, this could be a more complex, configurable engine.
CDI_RULES = [
    {
        "id": "pneumonia_specificity",
        "keyword": "pneumonia",
        "negation_keywords": ["organism", "bacterial", "viral", "lobar", "atypical"],
        "nudge": {
            "id": "pneumonia_specificity",
            "severity": "warning",
            "prompt": "Specify the causative organism for 'pneumonia' if known (e.g., bacterial, viral, or specific organism).",
        }
    },
    {
        "id": "uti_specificity",
        "keyword": "urinary tract infection",
        "negation_keywords": ["cystitis", "pyelonephritis", "urosepsis", "catheter-associated"],
        "nudge": {
            "id": "uti_specificity",
            "severity": "warning",
            "prompt": "Specify the site for 'urinary tract infection' if known (e.g., cystitis, pyelonephritis).",
        }
    },
    {
        "id": "fracture_laterality",
        "keyword": "fracture",
        "negation_keywords": ["left", "right", "bilateral"],
        "nudge": {
            "id": "fracture_laterality",
            "severity": "critical",
            "prompt": "Specify laterality (left, right) for the diagnosed 'fracture'.",
        }
    }
]
def get_cdi_nudges(note: str) -> List[Nudge]:
    """
    Analyzes a clinical note against a set of deterministic CDI rules.
    """
    found_nudges = []
    note_lower = note.lower()
    for rule in CDI_RULES:
        if rule["keyword"] in note_lower:
            # Check if any negation keyword is present, which would satisfy the rule
            is_satisfied = any(neg_keyword in note_lower for neg_keyword in rule["negation_keywords"])
            if not is_satisfied:
                found_nudges.append(Nudge(**rule["nudge"]))
    return found_nudges
# --- API Endpoint ---
@app.post("/analyze_draft_note", response_model=AnalyzeResponse)
async def analyze_draft_note(request: AnalyzeRequest):
    """
    Accepts a draft clinical note and returns a list of CDI "nudges"
    to prompt the physician for greater specificity before saving.
    """
    nudges = get_cdi_nudges(request.clinical_note)
    summary = f"Found {len(nudges)} potential documentation improvement(s)."
    return AnalyzeResponse(nudges=nudges, summary=summary)
# To run this API locally:
# 1. Install fastapi and uvicorn: pip install fastapi "uvicorn[standard]"
# 2. Run the server: uvicorn cdi_api:app --reload