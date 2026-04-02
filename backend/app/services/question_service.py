import json
import os
from typing import Any, Dict, Optional

from langchain.messages import HumanMessage
from langchain_groq import ChatGroq

TEACHING_STRATEGIES = {
    1: {
        "name": "Socratic questioning",
        "description": "Guide the student with foundational questions to build core intuition.",
    },
    2: {
        "name": "Feynman Technique",
        "description": "Ask the student to explain the concept in simple terms as if to a peer.",
    },
    3: {
        "name": "Active Recall / Application",
        "description": "Challenge the student to apply the concept to a new scenario or analyze its implications.",
    },
    4: {
        "name": "Synthesis / Interleaving",
        "description": "Connect the current concept to a previously learned one to build a mental map.",
    },
    5: {
        "name": "Metacognitive Reflection",
        "description": "Ask the student to evaluate their own understanding and identify remaining gaps.",
    },
}


def generate_question(
    concept: str,
    difficulty_level: int,
    source_text: str,
) -> str:
    if not os.getenv("GROQ_API_KEY"):
        return f"Brain disconnected. Please check your API key to discuss {concept}."

    strategy = TEACHING_STRATEGIES.get(difficulty_level, TEACHING_STRATEGIES[1])

    prompt = f"""You are a master teacher using {strategy["name"]}.
Goal: {strategy["description"]}

Concept: "{concept}"
Context from text: {source_text[:1000]}

Generate a single engaging question that implements this strategy for the given concept.
Do not provide multiple choice options. Return only the question text."""

    try:
        llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.7)
        response = llm.invoke([HumanMessage(content=prompt)])
        return response.content.strip()
    except Exception as e:
        error_msg = str(e).lower()
        if "network" in error_msg or "connection" in error_msg:
            return "I'm having trouble connecting to my brain (Network Error). Please check your internet."
        return f"Based on the text, how would you describe the core objective of {concept}?"


def evaluate_answer(
    student_answer: str,
    concept: str,
    correct_answer_hint: str,
    difficulty_level: int,
) -> Dict[str, Any]:
    if not os.getenv("GROQ_API_KEY"):
        return {
            "evaluation": "partially_correct",
            "feedback": "Brain disconnected. Please check your API key.",
            "next_difficulty": 1,
            "scaffold_question": "Please set up your environment to continue.",
        }

    strategy = TEACHING_STRATEGIES.get(difficulty_level, TEACHING_STRATEGIES[1])

    prompt = f"""You are a technical tutor evaluating a student's response regarding "{concept}".
Pedagogy: {strategy["name"]}
Context: {correct_answer_hint}
Student: "{student_answer}"

Evaluate the student's answer.
1. If they are correct, reinforce their understanding.
2. If they are incorrect or gave a very short answer, provide a helpful nudge or correction based on the text.
3. Always provide a 'scaffold_question' to keep the session active.

Return ONLY a JSON object:
{{
    "evaluation": "correct" | "partially_correct" | "incorrect",
    "feedback": "Your specific feedback or correction.",
    "next_difficulty": {difficulty_level},
    "scaffold_question": "Your follow-up question."
}}"""

    try:
        llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.2)
        res = llm.invoke([HumanMessage(content=prompt)])
        raw = res.content.strip()

        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start == -1:
            raise ValueError("No JSON found")

        data = json.loads(raw[start:end])

        return {
            "evaluation": data.get("evaluation", "partially_correct"),
            "feedback": data.get("feedback", "I'm looking at your answer."),
            "next_difficulty": data.get("next_difficulty", difficulty_level),
            "scaffold_question": data.get(
                "scaffold_question", f"Can you elaborate more on {concept}?"
            ),
        }
    except Exception as e:
        error_msg = str(e).lower()
        feedback = "I'm processing your response. Let's look closer at the document."

        if (
            "network" in error_msg
            or "connection" in error_msg
            or "unreachable" in error_msg
        ):
            feedback = "Connection Error: I'm having trouble reaching the Groq API. Please check your network."
        elif "rate_limit" in error_msg:
            feedback = "I'm thinking a bit too fast for my current limits. Give me a moment and try again."

        return {
            "evaluation": "partially_correct",
            "feedback": feedback,
            "next_difficulty": difficulty_level,
            "scaffold_question": f"What does the text say about the primary role of {concept}?",
        }


def generate_followup_question(
    concept: str,
    previous_answer: str,
    difficulty_level: int,
    source_text: str,
) -> str:
    if not os.getenv("GROQ_API_KEY"):
        return "Brain disconnected."

    prompt = f"""The student provided this answer about "{concept}": "{previous_answer}"
Context: {source_text[:800]}

Generate a simpler follow-up question to guide them. Only return the question text."""

    try:
        llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.6)
        response = llm.invoke([HumanMessage(content=prompt)])
        return response.content.strip()
    except Exception:
        return f"Could you explain another aspect of {concept} mentioned here?"
