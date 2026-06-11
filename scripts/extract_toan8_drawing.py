import re

def clean_text(text):
    # Remove pipes and dashes
    text = re.sub(r'\|\s*', '', text)
    text = re.sub(r'--+\s*', '', text)
    # Remove artifacts
    text = text.replace('(cid:92)', '').replace('(cid:91)', '').replace('(cid:18)', '').replace('(cid:19)', '')
    text = text.replace('(cid:136)', '').replace('(cid:112)', '').replace('(cid:114)', '').replace('(cid:115)', '')
    # Normalize spaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def is_drawing_useful(text):
    text_lower = text.lower()
    # Skip purely numerical ratio/perimeter problems as requested
    if "chu vi" in text_lower and ("tỉ lệ" in text_lower or "a:b:c:d" in text_lower):
        return False
    if "tổng số đo bốn góc" in text_lower and len(text) < 100:
        return False
    
    # Keywords that imply a drawing/construction
    useful_keywords = [
        "cho tam giác", "cho tứ giác", "cho hình thang", "cho hình bình hành",
        "cho hình chữ nhật", "cho hình thoi", "cho hình vuông", "cho đường tròn",
        "kẻ ", "vẽ ", "giao điểm", "trung điểm", "phân giác", "đường cao",
        "trung tuyến", "song song", "vuông góc", "tiếp xúc", "nội tiếp",
        "ngoại tiếp", "đối xứng", "hình vẽ sau"
    ]
    
    return any(k in text_lower for k in useful_keywords)

def extract():
    with open('toán_8_hình.md', 'r') as f:
        content = f.read()

    # Split by Topic/Section markers to maintain context
    topics = re.split(r'\n([A-ZÀ-Ỹ\s]{3,})\n', content)
    
    final_output = []
    
    for i in range(1, len(topics), 2):
        topic_name = topics[i].strip()
        topic_body = topics[i+1]
        
        if topic_name == 'MỤC LỤC': continue
        
        # Look for problem markers
        # Markers: "Bài X:", "Câu X:", "Bài toán X:"
        problems = re.split(r'((?:Bài|Câu|Bài toán)\s+\d+\s*:)', topic_body)
        
        for k in range(1, len(problems), 2):
            header = problems[k].strip()
            body = problems[k+1]
            
            # Extract content until solution or next major break
            problem_content = re.split(r'(Lời giải|Giải thích|Cách giải|Dạng \d+)', body, flags=re.IGNORECASE)[0]
            
            cleaned_problem = clean_text(problem_content)
            
            if len(cleaned_problem) > 15 and is_drawing_useful(cleaned_problem):
                entry = f"[{topic_name}] {header} {cleaned_problem}"
                final_output.append(entry)

    # Save to a new file
    with open('docs/datasets/toan_8_hinh_drawing_useful.txt', 'w') as f:
        f.write("\n\n".join(final_output))

if __name__ == "__main__":
    extract()
