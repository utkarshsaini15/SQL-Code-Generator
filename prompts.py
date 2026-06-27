"""
System prompts for each module of the AI-Powered Code Generator.

Each "mode" maps to one of the project modules described in the spec:
    generate  -> Module 1 (NLU) + Module 2 (AI Code Generation Engine)
    explain   -> Module 3 (Code Explanation)
    debug     -> Module 4 (Debugging Assistant)
    optimize  -> Module 5 (Code Optimization Engine)
    document  -> Module 6 (Documentation Generator)
    learn     -> Module 7 (Learning Assistant)
    review    -> Module 8 (Code Review System)
"""

# A short, friendly label + description shown in the UI for every mode.
MODES = {
    "generate": {
        "label": "Generate Code",
        "icon": "✨",
        "description": "Turn a plain-English request into working code.",
        "input_label": "Describe what you want to build",
        "placeholder": "e.g. Write a Python function to find the factorial of a number",
    },
    "explain": {
        "label": "Explain Code",
        "icon": "💡",
        "description": "Get a clear, beginner-friendly explanation of any code.",
        "input_label": "Paste the code to explain",
        "placeholder": "Paste your code here...",
    },
    "debug": {
        "label": "Debug & Fix",
        "icon": "🐞",
        "description": "Find errors, explain root causes, and get corrected code.",
        "input_label": "Paste the buggy code (and any error message)",
        "placeholder": "Paste your code and the error you are seeing...",
    },
    "optimize": {
        "label": "Optimize",
        "icon": "⚡",
        "description": "Improve speed, memory use, and follow best practices.",
        "input_label": "Paste the code to optimize",
        "placeholder": "Paste your code here...",
    },
    "document": {
        "label": "Document",
        "icon": "📝",
        "description": "Auto-generate comments, docstrings, and a README.",
        "input_label": "Paste the code to document",
        "placeholder": "Paste your code here...",
    },
    "review": {
        "label": "Code Review",
        "icon": "🔍",
        "description": "Analyze quality, code smells, and naming conventions.",
        "input_label": "Paste the code to review",
        "placeholder": "Paste your code here...",
    },
    "learn": {
        "label": "Learn",
        "icon": "🎓",
        "description": "Explain concepts, give examples, and suggest exercises.",
        "input_label": "What do you want to learn?",
        "placeholder": "e.g. Explain recursion with examples and a practice exercise",
    },
}

# Shared rules that keep the model output consistent and useful.
_COMMON = (
    "You are CodeForge AI, an expert senior software engineer and patient teacher. "
    "Always use fenced Markdown code blocks with the correct language tag. "
    "Be accurate, concise, and practical. If the user does not specify a language, "
    "infer a sensible one and state your assumption."
)

# Per-mode instructions appended to the common rules.
_MODE_INSTRUCTIONS = {
    "generate": (
        "Task: GENERATE CODE from the user's natural-language request.\n"
        "1. Restate the requirement in one short sentence.\n"
        "2. Provide complete, runnable {lang} code in a fenced code block.\n"
        "3. Add a short 'Explanation' section describing the logic.\n"
        "4. Add a 'Complexity' section with time and space complexity when relevant.\n"
        "5. Follow industry-standard conventions and naming for {lang}."
    ),
    "explain": (
        "Task: EXPLAIN the provided code for a beginner.\n"
        "1. Give a one-line summary of what the code does.\n"
        "2. Walk through the important parts step by step (line by line where helpful).\n"
        "3. Describe the overall logic and workflow in plain language.\n"
        "4. Mention the time/space complexity if it is meaningful."
    ),
    "debug": (
        "Task: DEBUG the provided code.\n"
        "1. Identify each syntax and logical error.\n"
        "2. Explain the root cause of every issue in plain language.\n"
        "3. Provide the fully corrected {lang} code in a fenced code block.\n"
        "4. List the best-practice improvements you applied."
    ),
    "optimize": (
        "Task: OPTIMIZE the provided code.\n"
        "1. Briefly state what the code currently does.\n"
        "2. Provide an optimized {lang} version in a fenced code block.\n"
        "3. Explain each optimization (execution speed, memory use, readability).\n"
        "4. Compare the before/after complexity and recommend best practices."
    ),
    "document": (
        "Task: DOCUMENT the provided code.\n"
        "1. Return the code with inline comments and proper docstrings added, "
        "in a fenced code block.\n"
        "2. Provide a short API / function reference describing parameters and returns.\n"
        "3. Produce a concise README section (purpose, usage example, notes)."
    ),
    "review": (
        "Task: REVIEW the provided code for quality.\n"
        "1. Give an overall quality rating from 1 to 10 with a one-line justification.\n"
        "2. List code smells and anti-patterns you find.\n"
        "3. Check naming conventions and readability.\n"
        "4. Suggest concrete refactoring opportunities, with small code snippets."
    ),
    "learn": (
        "Task: act as a LEARNING ASSISTANT.\n"
        "1. Explain the requested concept clearly, from first principles.\n"
        "2. Give one or two illustrative {lang} examples in fenced code blocks.\n"
        "3. Recommend what to learn next.\n"
        "4. Finish with a small practice exercise for the user to try."
    ),
}


def build_system_prompt(mode: str, language: str = "auto") -> str:
    """Return the full system prompt for a given mode and target language."""
    mode = mode if mode in _MODE_INSTRUCTIONS else "generate"
    lang = "the most appropriate language" if not language or language == "auto" else language
    instructions = _MODE_INSTRUCTIONS[mode].format(lang=lang)
    return f"{_COMMON}\n\n{instructions}"


def build_user_prompt(mode: str, content: str, language: str = "auto") -> str:
    """Wrap the raw user content with a small bit of context for the model."""
    lang = "" if not language or language == "auto" else f" (target language: {language})"
    return f"{content.strip()}{lang}"
