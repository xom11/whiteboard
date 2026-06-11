import re

def clean_text(text):
    # Remove pipes and dashes
    text = re.sub(r'\|\s*', '', text)
    text = re.sub(r'--+\s*', '', text)
    # Remove specific artifacts
    text = text.replace('(cid:92)', '').replace('(cid:91)', '').replace('(cid:18)', '').replace('(cid:19)', '')
    text = text.replace('(cid:136)', '').replace('(cid:112)', '').replace('(cid:114)', '').replace('(cid:115)', '')
    # Normalize spaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract():
    with open('toán_8_hình.md', 'r') as f:
        content = f.read()

    # Find Topics (Uppercase titles at start of line)
    topics = re.split(r'\n([A-ZÀ-Ỹ\s]{3,})\n', content)
    
    final_output = []
    
    for i in range(1, len(topics), 2):
        topic_name = topics[i].strip()
        topic_body = topics[i+1]
        
        if topic_name == 'MỤC LỤC': continue
        
        sections = re.split(r'(Dạng \d+:|BÀI TẬP TRẮC NGHIỆM|BÀI TẬP TỰ LUYỆN|BÀI TẬP VỀ NHÀ)', topic_body, flags=re.IGNORECASE)
        
        if len(sections) == 1:
            # Maybe the whole topic body is just problems?
            problem_splits = re.split(r'((?:Bài|Câu)\s+\d+\s*:)', topic_body)
            for k in range(1, len(problem_splits), 2):
                header = problem_splits[k].strip()
                body = problem_splits[k+1]
                problem_text = re.split(r'(Lời giải|Giải thích|Cách giải)', body, flags=re.IGNORECASE)[0]
                cleaned_body = clean_text(problem_text)
                if len(cleaned_body) > 10:
                    final_output.append(f"[{topic_name}] {header} {cleaned_body}")
            continue

        for j in range(1, len(sections), 2):
            section_name = sections[j].strip()
            section_body = sections[j+1]
            
            problem_splits = re.split(r'((?:Bài|Câu)\s+\d+\s*:)', section_body)
            
            for k in range(1, len(problem_splits), 2):
                header = problem_splits[k].strip()
                body = problem_splits[k+1]
                problem_text = re.split(r'(Lời giải|Giải thích|Cách giải)', body, flags=re.IGNORECASE)[0]
                cleaned_body = clean_text(problem_text)
                if len(cleaned_body) > 10:
                    problem_entry = f"[{topic_name}] [{section_name}] {header} {cleaned_body}"
                    final_output.append(problem_entry)

    with open('docs/datasets/toan_8_hinh_cleaned.txt', 'w') as f:
        f.write("\n\n".join(final_output))

if __name__ == "__main__":
    extract()
