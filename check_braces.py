lines = open('supabase/functions/execute-radar/index.ts').readlines()
depth = 0
candidate_def_depth = -1
candidate_def_line = -1

for i, line in enumerate(lines):
    # simple heuristic: ignore comments/strings for now (or basic)
    # Actually, let's just count { and } roughly.
    # Comments: //
    stripped = line.split('//')[0]
    
    for char in stripped:
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if candidate_def_depth != -1 and depth < candidate_def_depth:
                print(f"Scope of rawCandidates (defined at {candidate_def_line+1}) CLOSED at line {i+1}")
                candidate_def_depth = -1 # Report only once
            
    if 'const rawCandidates: Candidate[]' in stripped:
        candidate_def_depth = depth
        candidate_def_line = i
        print(f"rawCandidates defined at line {i+1}, depth {depth}")

    if 'if (rawCandidates.length > 0)' in stripped:
         print(f"Usage at line {i+1}, current depth {depth}")

