
from datetime import datetime, timezone
from typing import Dict, Any, List
from pydantic import BaseModel
from secure_storage import SecureStorage
import json

class Feedback(BaseModel):
    id: str
    type: str  # 'bug', 'improvement', 'security'
    title: str
    description: str
    status: str  # 'new', 'under_review', 'approved', 'rejected', 'implemented'
    submitted_by: str
    submission_date: datetime
    priority: str
    votes: int = 0

class FeedbackSystem:
    def __init__(self):
        self.storage = SecureStorage()
        
    def submit_feedback(self, feedback_data: Dict[str, Any], user_id: str) -> Feedback:
        feedback = Feedback(
            id=f"fb_{datetime.now(timezone.utc).timestamp()}",
            type=feedback_data['type'],
            title=feedback_data['title'],
            description=feedback_data['description'],
            status='new',
            submitted_by=user_id,
            submission_date=datetime.now(timezone.utc),
            priority='medium',
            votes=0
        )
        
        self.storage.secure_write(
            f"feedback/{feedback.id}.json",
            feedback.dict()
        )
        return feedback

    def get_all_feedback(self) -> List[Feedback]:
        feedback_files = self.storage.list_files("feedback")
        return [Feedback(**json.loads(self.storage.secure_read(f))) 
                for f in feedback_files]

    def update_feedback_status(self, feedback_id: str, status: str) -> bool:
        try:
            feedback_data = json.loads(
                self.storage.secure_read(f"feedback/{feedback_id}.json")
            )
            feedback_data['status'] = status
            self.storage.secure_write(
                f"feedback/{feedback_id}.json",
                feedback_data
            )
            return True
        except:
            return False
