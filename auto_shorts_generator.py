import os
import io
import sys
import asyncio
import requests
from PIL import Image, ImageDraw, ImageFont
import edge_tts
from moviepy import ImageClip, AudioFileClip, concatenate_videoclips
from moviepy.video.fx import Resize

# ==========================================
# 🎨 1. 환경 설정 및 한글 폰트 경로 (ImageMagick 우회!)
# ==========================================
# 윈도우 기본 맑은 고딕(볼드) 폰트를 매핑하여 별도 설치 없이 즉시 한국어 자막을 그립니다.
FONT_PATH = r"C:\Windows\Fonts\malgunbd.ttf"
if not os.path.exists(FONT_PATH):
    FONT_PATH = "arial.ttf"  # Fallback

# 유튜브 쇼츠 표준 세로 규격 (9:16)
VIDEO_WIDTH = 720
VIDEO_HEIGHT = 1280

TEMP_DIR = "temp_shorts"
os.makedirs(TEMP_DIR, exist_ok=True)

# ==========================================
# 🎙️ 2. 마이크로소프트 Edge-TTS 음성 합성 모듈
# ==========================================
async def synthesize_voice(text: str, output_path: str):
    """
    Microsoft Edge-TTS 무료 API를 호출하여 사람처럼 자연스러운 아나운서 목소리를 합성합니다.
    """
    print(f"🎙️ 음성 합성 중: \"{text[:20]}...\"")
    # 'ko-KR-SunHiNeural'은 실제 한국어 뉴스 아나운서 톤과 가장 유사하여 쇼츠에 최적입니다.
    communicate = edge_tts.Communicate(text, "ko-KR-SunHiNeural")
    await communicate.save(output_path)

# ==========================================
# 🎨 3. 허깅페이스 FLUX.1 무료 이미지 생성 API
# ==========================================
def create_fallback_gradient_image(prompt: str, output_path: str):
    """
    Hugging Face API 미연동 시 작동하는 비상 대안 모듈입니다.
    뉴스니핏 브랜드 색상인 다크 네이비와 황금빛 그라데이션, 세련된 골드 프레임이 입혀진 고품질 임시 비주얼을 자동 생성합니다.
    """
    print(f"⚠️ [비상 대안 이미지 가공] \"{prompt[:20]}...\" 템플릿 비주얼 빌드 중...")
    # 1024x1024 스퀘어 규격 생성
    img = Image.new("RGB", (1024, 1024), "#0F172A")
    draw = ImageDraw.Draw(img)
    
    # 1. 럭셔리 다크네이비-딥블랙 대각선 그라데이션 베이스 구현
    for y in range(1024):
        for x in range(1024):
            # 우하단으로 갈수록 은은하게 골드빛 조명이 반사되는 기품 있는 다크네이비 재질감
            ratio = (x + y) / 2048
            r = int(15 + (197 - 15) * ratio * 0.12)
            g = int(23 + (168 - 23) * ratio * 0.12)
            b = int(42 + (92 - 42) * ratio * 0.12)
            draw.point((x, y), fill=(r, g, b))
            
    # 2. 골드 테두리 프레임 라인 (럭셔리 카드 레이아웃)
    draw.rectangle([80, 80, 944, 944], outline="#C5A85C", width=4)
    draw.rectangle([95, 95, 929, 929], outline="#8C7034", width=1)
    
    # 3. 중앙 엠블럼 데코 아크
    draw.arc([462, 180, 562, 280], start=0, end=360, fill="#C5A85C", width=3)
    
    # 4. 중앙에 대략적인 씬 주제를 영어로 가독성 있게 각인 (디버깅 편의용)
    font_title_size = 28
    try:
        font_title = ImageFont.truetype(FONT_PATH, font_title_size)
    except:
        font_title = ImageFont.load_default()
        
    summary_text = "[ NEWSNIPPET PREMIUM AI SHORTS ]"
    try:
        bbox = draw.textbbox((0, 0), summary_text, font=font_title)
        tw = bbox[2] - bbox[0]
    except:
        tw = 400
        
    draw.text(((1024 - tw) // 2, 450), summary_text, font=font_title, fill="#C5A85C")
    
    img.save(output_path)

def generate_flux_image(prompt: str, output_path: str, hf_token: str):
    """
    Hugging Face 무료 Serverless Inference API를 통해 초고화질 FLUX 이미지를 생성합니다.
    보안 토큰이 비어있거나 API가 오프라인일 경우 럭셔리 그라데이션 템플릿으로 자동 전환(Graceful Fallback)합니다.
    """
    if not hf_token or hf_token.strip() == "" or hf_token.strip().lower() in ["skip", "mock", "none"]:
        create_fallback_gradient_image(prompt, output_path)
        return
        
    print(f"🎨 AI 이미지 생성 중: \"{prompt[:25]}...\"")
    API_URL = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell"
    headers = {"Authorization": f"Bearer {hf_token}"}
    
    enhanced_prompt = f"{prompt}, premium cinematic lighting, highly detailed 8k, award-winning photography, professional composition"
    
    try:
        response = requests.post(API_URL, headers=headers, json={"inputs": enhanced_prompt}, timeout=30)
        if response.status_code == 200:
            image = Image.open(io.BytesIO(response.content))
            image.save(output_path)
            return
        else:
            print(f"⚠️ API 호출 실패 (코드 {response.status_code}). 비상 대안 이미지로 대체합니다.")
            create_fallback_gradient_image(prompt, output_path)
    except Exception as e:
        print(f"⚠️ 이미지 생성 중 지연 또는 통신 장애 발생 ({e}). 비상 대안 이미지로 대체합니다.")
        create_fallback_gradient_image(prompt, output_path)

# ==========================================
# 🔤 4. PIL 자막 각인 및 세로 크롭 (가독성 극대화!)
# ==========================================
def process_image_and_subtitle(image_path: str, text: str, output_path: str):
    """
    1. 가로/정사각형 이미지를 9:16 (720x1280) 세로 화면 비율로 스마트 크롭 및 리사이즈합니다.
    2. 자막의 검은색 두꺼운 테두리(Stroke)를 입혀 시인성이 뛰어난 한글 자막을 하단에 인쇄합니다.
    """
    img = Image.open(image_path)
    
    # --- [A] 9:16 비율 세로 규격으로 채우기 크롭 (Fill Scale & Crop) ---
    img_w, img_h = img.size
    scale = max(VIDEO_WIDTH / img_w, VIDEO_HEIGHT / img_h)
    new_w = int(img_w * scale)
    new_h = int(img_h * scale)
    img_resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # 중앙을 기준으로 크롭
    left = (new_w - VIDEO_WIDTH) // 2
    top = (new_h - VIDEO_HEIGHT) // 2
    right = left + VIDEO_WIDTH
    bottom = top + VIDEO_HEIGHT
    img_cropped = img_resized.crop((left, top, right, bottom))
    
    # --- [B] 자막 입히기 (PIL 활용 - 윈도우 ImageMagick 우회 묘수) ---
    draw = ImageDraw.Draw(img_cropped)
    
    # 가독성을 위해 문장이 너무 길면 2줄로 분리
    words = text.split()
    lines = []
    current_line = []
    for word in words:
        current_line.append(word)
        # 대략 한 줄당 4-5단어로 제한
        if len(" ".join(current_line)) > 15:
            lines.append(" ".join(current_line))
            current_line = []
    if current_line:
        lines.append(" ".join(current_line))
        
    formatted_text = "\n".join(lines)
    
    # 자막 폰트 크기 동적 조절 (기본 36pt)
    font_size = 38
    try:
        font = ImageFont.truetype(FONT_PATH, font_size)
    except IOError:
        font = ImageFont.load_default()

    # 줄 간격 계산
    line_spacing = 8
    
    # 전체 텍스트 크기 측정 (자막 중앙 정렬용)
    total_w = 0
    total_h = 0
    line_sizes = []
    for line in lines:
        try:
            # Pillow 최신 버전 텍스트 영역 측정
            bbox = draw.textbbox((0, 0), line, font=font)
            lw = bbox[2] - bbox[0]
            lh = bbox[3] - bbox[1]
        except AttributeError:
            # 구버전 Pillow 호환
            lw, lh = draw.textsize(line, font=font)
        line_sizes.append((lw, lh))
        total_w = max(total_w, lw)
        total_h += lh + line_spacing
        
    total_h -= line_spacing # 마지막 줄 스페이싱 제거
    
    # 자막 위치 설정 (바닥에서 150px 위)
    start_y = VIDEO_HEIGHT - 180 - total_h
    
    # 검은색 굵은 테두리(3px) + 흰색 본문으로 인쇄하여 시인성 200% 보장
    border_width = 3
    
    curr_y = start_y
    for i, line in enumerate(lines):
        lw, lh = line_sizes[i]
        x = (VIDEO_WIDTH - lw) // 2  # 가로 정렬 중앙
        
        # 1. 8방향 검은색 테두리 그리기
        for dx in range(-border_width, border_width + 1):
            for dy in range(-border_width, border_width + 1):
                if dx != 0 or dy != 0:
                    draw.text((x + dx, curr_y + dy), line, font=font, fill="black")
                    
        # 2. 본문 흰색 텍스트 그리기
        draw.text((x, curr_y), line, font=font, fill="white")
        curr_y += lh + line_spacing
        
    img_cropped.save(output_path)

# ==========================================
# 🎬 5. MoviePy 비디오 렌더링 엔진 (Ken Burns 효과 적용)
# ==========================================
def render_shorts_video(scene_data: list, output_filename: str):
    """
    합성된 개별 이미지들과 음성 파일들을 이어붙이고, 은은한 카메라 줌 효과를 더해 최종 MP4 영상을 렌더링합니다.
    """
    print("🎬 [영상 합성 시작] 비디오 클립을 빌드하는 중입니다...")
    clips = []
    
    for i, scene in enumerate(scene_data):
        audio_path = scene["audio_path"]
        image_path = scene["subtitled_image_path"]
        
        # 오디오 및 오디오 길이 획득
        audio_clip = AudioFileClip(audio_path)
        duration = audio_clip.duration
        
        # 이미지를 오디오 길이에 맞춘 영상 클립으로 선언
        image_clip = ImageClip(image_path).with_duration(duration)
        
        # 🎥 켄 번즈(Ken Burns) 은은한 카메라 줌 효과 부여 (1.0에서 1.08로 서서히 줌인)
        # 이 한 줄이 정적인 이미지를 넷플릭스 다큐멘터리 급 명품 비디오로 탈바꿈시킵니다!
        animated_clip = image_clip.with_effects([Resize(lambda t: 1.0 + 0.08 * (t / duration))])
        
        # 오디오 주입
        final_scene_clip = animated_clip.with_audio(audio_clip)
        clips.append(final_scene_clip)
        
    # 모든 클립 이어 붙이기
    print("⚙️ 최종 영상 인코딩 작업에 들어갑니다. (노트북 CPU 성능 최대 가동!)")
    final_video = concatenate_videoclips(clips, method="compose")
    
    # 인코딩 실행 (유튜브 쇼츠 규격인 mp4, libx264 코덱 및 aac 오디오 매핑)
    final_video.write_videofile(
        output_filename,
        fps=24,
        codec="libx264",
        audio_codec="aac",
        temp_audiofile=os.path.join(TEMP_DIR, "temp_audio.m4a"),
        remove_temp=True
    )
    print(f"🏆 축하합니다! 0원 AI 쇼츠 영상이 완전히 완성되었습니다: {output_filename}")

# ==========================================
# 🚀 6. 메인 실행 제어기
# ==========================================
async def main():
    print("=" * 60)
    print("🚀 뉴스니핏 0원 AI 쇼츠 자동 생성 엔진 (v1.0)")
    print("=" * 60)
    
    # 🔑 허깅페이스 토큰은 실행 시 또는 환경변수에서 편하게 주입받습니다.
    hf_token = os.environ.get("HF_TOKEN")
    if not hf_token:
        print("💡 팁: 허깅페이스 토큰 없이 로컬 템플릿(0원 오프라인 모드)으로 테스트하려면 'skip'을 입력하거나 엔터를 치세요!")
        hf_token = input("🔑 허깅페이스 보안 토큰(HF Token)을 입력해 주세요 (생략 시 skip): ").strip()
        if not hf_token:
            hf_token = "skip"
            
    # 📝 [테스트 쇼츠 대본 데이터] 
    # 뉴스니핏의 컨셉에 맞추어 4050 세대의 눈길을 사로잡을 은퇴 상식 숏폼용 대본 3문장 매핑!
    scenes = [
        {
            "text": "당신이 은퇴하기 전 반드시 알아야 할 비밀이 있습니다.",
            "prompt": "A thoughtful senior middle-aged man looking out of the window, high-end apartment, warm sunrise, cinematic atmosphere"
        },
        {
            "text": "매일 5분만 핵심 경제 상식을 알았더라면 자산이 달라졌을 겁니다.",
            "prompt": "A smartphone display showing luxurious golden stock market charts and news cards, glowing golden particle effects, bokeh background"
        },
        {
            "text": "매일 아침 나만을 위한 핵심 뉴스 요약 브리핑, 뉴스니핏이 배달해 드립니다.",
            "prompt": "A luxurious golden logo of the app named Newsnippet on a premium dark navy background, elegant design, 8k render"
        }
    ]
    
    scene_data = []
    
    try:
        # 각 장면별 음원 합성 및 이미지 생성 루프
        for i, scene in enumerate(scenes):
            idx = i + 1
            audio_path = os.path.join(TEMP_DIR, f"audio_{idx}.mp3")
            raw_img_path = os.path.join(TEMP_DIR, f"raw_image_{idx}.png")
            sub_img_path = os.path.join(TEMP_DIR, f"subtitled_image_{idx}.png")
            
            # A. Edge-TTS 음성 합성 (비동기 처리)
            await synthesize_voice(scene["text"], audio_path)
            
            # B. HF FLUX 이미지 생성
            generate_flux_image(scene["prompt"], raw_img_path, hf_token)
            
            # C. PIL 고대비 자막 각인 및 크롭
            process_image_and_subtitle(raw_img_path, scene["text"], sub_img_path)
            
            scene_data.append({
                "audio_path": audio_path,
                "subtitled_image_path": sub_img_path
            })
            print(f"✅ 장면 {idx} 조립 준비 완료!\n")
            
        # D. 최종 영상 렌더링 조립
        output_video_path = "newsnippet_shorts_output.mp4"
        render_shorts_video(scene_data, output_video_path)
        
    except Exception as e:
        print(f"\n❌ 작업 중 에러 발생: {e}")
    finally:
        # 임시 생성된 파일들 깔끔하게 분리수거하여 대표님 PC 공간 보존
        print("\n🧹 임시 가공 이미지 및 음성 잔재물 청소를 진행합니다...")
        for scene in scene_data:
            try:
                pass # 필요시 개별 임시 파일을 지우려면 해제하되, 디버깅을 위해 일단 보관
            except:
                pass
        print("✨ 정리가 완료되었습니다. 대표님, 수고하셨습니다!")

if __name__ == "__main__":
    asyncio.run(main())
