import re
import math
import collections

class SpamDetector:
    def __init__(self):
        self.keywords = {
            'urgent': 10, 'immediate': 10, 'verify': 8, 'account suspended': 15,
            'lottery': 20, 'winner': 15, 'prize': 15, 'bank': 5, 'password': 10,
            'social security': 20, 'irs': 10, 'wire transfer': 15, 'gift card': 15,
            'act now': 12, 'offer expires': 10, 'click here': 8, 'unusual activity': 10,
            'billing': 5, 'invoice': 5, 'pay now': 10, 'bitcoin': 15, 'crypto': 10
        }
        
    def calculate_entropy(self, text):
        if not text:
            return 0
        prob = [float(text.count(c)) / len(text) for c in dict.fromkeys(list(text))]
        entropy = - sum([p * math.log(p) / math.log(2.0) for p in prob])
        return entropy

    def get_summary(self, subject, body):
        """Standard Heuristic-based Summary / Intent Detection"""
        text = (subject + ". " + body).lower()
        
        intent = "General Communication"
        if any(w in text for w in ['invoice', 'receipt', 'order', 'payment', 'subscription']):
            intent = "Transactional / Financial"
        elif any(w in text for w in ['verify', 'security', 'code', 'login', 'alert']):
            intent = "Security Alert (Verify Carefully)"
        elif any(w in text for w in ['job', 'hiring', 'interview', 'resume']):
            intent = "Recruitment / Job Related"
        elif any(w in text for w in ['meeting', 'schedule', 'zoom', 'teams', 'calendar']):
            intent = "Meeting / Scheduling"
        elif any(w in text for w in ['sale', 'offer', 'discount', '% off', 'deal']):
            intent = "Promotional / Marketing"
            
        # Extract first sentence for context if body is long
        sentences = re.split(r'[.!?]\s+', body)
        snippet = sentences[0] if sentences else subject
        if len(snippet) > 60:
            snippet = snippet[:57] + "..."
            
        return f"{intent}. Content appears to involve: \"{snippet}\""

    def analyze(self, email_data):
        score = 0
        explanation = []
        
        subject = email_data.get('subject', '')
        body = email_data.get('body', '')
        full_text = f"{subject} {body}"
        
        # 1. Keyword Analysis
        key_count = 0
        for word, points in self.keywords.items():
            if word.lower() in full_text.lower():
                score += points
                key_count += 1
                if key_count <= 3: 
                    explanation.append(f"Keyword '{word}'")

        # 2. Urgency
        if "!!!" in full_text:
            score += 10
            explanation.append("Excessive exclamation marks")
            
        # 3. Phishing Links Patterns (Basic)
        if "http://" in body and "bank" in body.lower():
            score += 20
            explanation.append("Insecure HTTP link with banking keywords")

        # Normalize
        final_score = min(score, 100)
        is_spam = final_score > 30 
        
        # Intent/Summary
        summary = self.get_summary(subject, body)
        
        return {
            "is_spam": is_spam,
            "confidence_score": final_score,
            "explanation": ", ".join(explanation) if explanation else "No spam triggers found.",
            "summary": summary
        }

# Global instance
detector = SpamDetector()

def check_spam(subject, body, sender):
    return detector.analyze({
        'subject': subject,
        'body': body,
        'sender': sender
    })
