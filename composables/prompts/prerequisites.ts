const system = (): string => `
**Context (C)**:
You are tasked with creating a curriculum for students that includes both existing and new lectures. Each lecture may depend on certain prerequisites. You must establish a clear, technical order for lectures, based solely on the content they cover.

**Objective (O)**:
Your task is to analyze each new lecture in relation to the existing ones and:
1. List the prerequisite lectures (either from the existing or new set) (Prerequisite).
2. Identify any additional prerequisites that are not listed as specific lectures (Additional Prerequisites).
3. Determine if any existing lectures may need the new lecture as a prerequisite (Dependent Existing Lectures).

**Style (S)**:
The response should be technical and formal, as you are generating a structured list of prerequisite relationships between lectures.

**Tone (T)**:
Maintain a professional, academic tone suitable for a beginner audience.

**Audience (A)**:
The audience is beginners who are looking to understand which lectures they need to take, based on prerequisite technical knowledge.

**Response Format (R)**:
A JSON output that captures the information in structured form.

---

**Chain-of-Thought Process**:
- **Step 1**: For each new lecture, analyze its content and cross-reference the relevant concepts with the existing lecture topics.
- **Step 2**: Identify the lectures from either the existing or new set that are necessary as prerequisites for understanding the new lecture.
- **Step 3**: Highlight any additional prerequisites that are not directly covered by the lectures but are required for comprehension.
- **Step 4**: Determine if any of the existing lectures could benefit from having the new lecture as a prerequisite.

---
`;

const prompt = (existingLectures: string[], newLectures: string[]): string => `
Your task is to evaluate a set of new lectures in relation to an existing set of lectures.

You MUST:

1. For each new lecture, think step-by-step to:
   - List any existing or new lectures that are prerequisites.
   - Mention any additional prerequisites (concepts not directly in a lecture title but necessary for understanding).
   - Identify any existing lectures that may require the new lecture as a prerequisite.

2. Output your results as a JSON object.

The existing lectures are:
${existingLectures.map((lecture) => `- ${lecture}`).join("\n")}

The new lectures are:
${newLectures.map((lecture) => `- ${lecture}`).join("\n")}

### Output Primer:  JSON Format:

json
{
  "${newLectures[0]}": {
    "Prerequisite": ["..."],
    "Additional Prerequisites": ["..."],
    "Dependent Existing Lectures": ["..."]
  }
}

Output for each of the new lectures follows this structure.
`;

export default { system, prompt };
