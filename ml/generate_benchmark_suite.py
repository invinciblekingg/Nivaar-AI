import os
import json
import cv2
import numpy as np

def create_benchmark_suite():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    out_dir = os.path.join(base_dir, "benchmark_data", "images")
    os.makedirs(out_dir, exist_ok=True)

    ground_truth = []

    np.random.seed(42)

    # =========================================================================
    # 1. STRUCTURAL CRACKS (6 Test Samples)
    # =========================================================================
    
    # Sample 1: Fine Hairline Crack
    img1 = np.full((500, 650, 3), (175, 180, 185), dtype=np.uint8)
    noise1 = np.random.normal(0, 7, (500, 650, 3)).astype(np.int16)
    img1 = np.clip(img1.astype(np.int16) + noise1, 0, 255).astype(np.uint8)
    pts1 = [(220, 100), (235, 160), (250, 220), (260, 290), (280, 370), (295, 440)]
    for j in range(len(pts1) - 1):
        cv2.line(img1, pts1[j], pts1[j+1], (25, 30, 35), 3, cv2.LINE_AA)
    cv2.line(img1, pts1[2], (pts1[2][0] + 30, pts1[2][1] + 25), (40, 45, 50), 2, cv2.LINE_AA)
    f1 = os.path.join(out_dir, "crack_01_hairline.jpg")
    cv2.imwrite(f1, img1)
    ground_truth.append({
        "filename": "crack_01_hairline.jpg",
        "category": "crack",
        "expected_defect": "Structural Crack",
        "expected_severity": "CRITICAL",
        "has_defect": True,
        "bbox_gt": [215, 95, 305, 445],
        "description": "Fine hairline structural fracture with micro-branching on bearing raceway."
    })

    # Sample 2: Diagonal Linear Fissure
    img2 = np.full((500, 650, 3), (180, 185, 190), dtype=np.uint8)
    noise2 = np.random.normal(0, 8, (500, 650, 3)).astype(np.int16)
    img2 = np.clip(img2.astype(np.int16) + noise2, 0, 255).astype(np.uint8)
    pts2 = [(160, 130), (195, 175), (230, 225), (265, 280), (305, 335), (345, 390), (380, 440)]
    for j in range(len(pts2) - 1):
        cv2.line(img2, pts2[j], pts2[j+1], (18, 22, 28), 5, cv2.LINE_AA)
        if j == 2:
            cv2.line(img2, pts2[j], (pts2[j][0] + 40, pts2[j][1] + 20), (35, 40, 45), 3, cv2.LINE_AA)
    f2 = os.path.join(out_dir, "crack_02_diagonal_fissure.jpg")
    cv2.imwrite(f2, img2)
    ground_truth.append({
        "filename": "crack_02_diagonal_fissure.jpg",
        "category": "crack",
        "expected_defect": "Structural Crack",
        "expected_severity": "CRITICAL",
        "has_defect": True,
        "bbox_gt": [155, 125, 385, 445],
        "description": "Severe diagonal surface fissure under cyclic rotational stress."
    })

    # Sample 3: Branching Fatigue Fracture
    img3 = np.full((500, 650, 3), (170, 175, 180), dtype=np.uint8)
    noise3 = np.random.normal(0, 9, (500, 650, 3)).astype(np.int16)
    img3 = np.clip(img3.astype(np.int16) + noise3, 0, 255).astype(np.uint8)
    main_trunk = [(320, 120), (325, 190), (318, 260), (315, 340), (310, 420)]
    for j in range(len(main_trunk) - 1):
        cv2.line(img3, main_trunk[j], main_trunk[j+1], (15, 20, 25), 4, cv2.LINE_AA)
    # Branches
    cv2.line(img3, (325, 190), (250, 230), (25, 30, 35), 3, cv2.LINE_AA)
    cv2.line(img3, (250, 230), (205, 280), (35, 40, 45), 2, cv2.LINE_AA)
    cv2.line(img3, (318, 260), (385, 300), (25, 30, 35), 3, cv2.LINE_AA)
    cv2.line(img3, (385, 300), (430, 350), (35, 40, 45), 2, cv2.LINE_AA)
    f3 = os.path.join(out_dir, "crack_03_branching_fatigue.jpg")
    cv2.imwrite(f3, img3)
    ground_truth.append({
        "filename": "crack_03_branching_fatigue.jpg",
        "category": "crack",
        "expected_defect": "Structural Crack",
        "expected_severity": "CRITICAL",
        "has_defect": True,
        "bbox_gt": [200, 115, 435, 425],
        "description": "Multi-branch fatigue fracture network radiating from central stress riser."
    })

    # Sample 4: Transverse Shaft Fracture
    img4 = np.full((500, 650, 3), (160, 165, 170), dtype=np.uint8)
    noise4 = np.random.normal(0, 8, (500, 650, 3)).astype(np.int16)
    img4 = np.clip(img4.astype(np.int16) + noise4, 0, 255).astype(np.uint8)
    pts4 = [(130, 240), (200, 248), (270, 242), (350, 255), (420, 250), (510, 258)]
    for j in range(len(pts4) - 1):
        cv2.line(img4, pts4[j], pts4[j+1], (20, 25, 30), 4, cv2.LINE_AA)
    f4 = os.path.join(out_dir, "crack_04_transverse_shaft.jpg")
    cv2.imwrite(f4, img4)
    ground_truth.append({
        "filename": "crack_04_transverse_shaft.jpg",
        "category": "crack",
        "expected_defect": "Structural Crack",
        "expected_severity": "CRITICAL",
        "has_defect": True,
        "bbox_gt": [125, 235, 515, 265],
        "description": "Transverse circumferential crack traversing shaft perimeter."
    })

    # Sample 5: Longitudinal Raceway Crack
    img5 = np.full((500, 650, 3), (185, 190, 195), dtype=np.uint8)
    noise5 = np.random.normal(0, 6, (500, 650, 3)).astype(np.int16)
    img5 = np.clip(img5.astype(np.int16) + noise5, 0, 255).astype(np.uint8)
    pts5 = [(330, 80), (338, 150), (332, 230), (336, 310), (328, 390), (335, 460)]
    for j in range(len(pts5) - 1):
        cv2.line(img5, pts5[j], pts5[j+1], (22, 28, 34), 4, cv2.LINE_AA)
    f5 = os.path.join(out_dir, "crack_05_longitudinal_raceway.jpg")
    cv2.imwrite(f5, img5)
    ground_truth.append({
        "filename": "crack_05_longitudinal_raceway.jpg",
        "category": "crack",
        "expected_defect": "Structural Crack",
        "expected_severity": "CRITICAL",
        "has_defect": True,
        "bbox_gt": [320, 75, 345, 465],
        "description": "Longitudinal raceway fissure parallel to rotational axis."
    })

    # Sample 6: High-Noise Grain Textured Crack
    img6 = np.full((500, 650, 3), (150, 155, 160), dtype=np.uint8)
    noise6 = np.random.normal(0, 14, (500, 650, 3)).astype(np.int16)
    img6 = np.clip(img6.astype(np.int16) + noise6, 0, 255).astype(np.uint8)
    pts6 = [(190, 180), (230, 220), (270, 270), (315, 315), (370, 360), (430, 410)]
    for j in range(len(pts6) - 1):
        cv2.line(img6, pts6[j], pts6[j+1], (12, 16, 20), 5, cv2.LINE_AA)
    f6 = os.path.join(out_dir, "crack_06_textured_weld.jpg")
    cv2.imwrite(f6, img6)
    ground_truth.append({
        "filename": "crack_06_textured_weld.jpg",
        "category": "crack",
        "expected_defect": "Structural Crack",
        "expected_severity": "CRITICAL",
        "has_defect": True,
        "bbox_gt": [185, 175, 435, 415],
        "description": "High-contrast weld toe crack in rough cast structural steel."
    })

    # =========================================================================
    # 2. PITTING CORROSION (6 Test Samples)
    # =========================================================================

    # Sample 7: Wide Area Oxidation Rust Patch
    img7 = np.full((500, 650, 3), (125, 130, 135), dtype=np.uint8)
    noise7 = np.random.normal(0, 10, (500, 650, 3)).astype(np.int16)
    img7 = np.clip(img7.astype(np.int16) + noise7, 0, 255).astype(np.uint8)
    cv2.circle(img7, (270, 230), 80, (25, 70, 180), -1)
    cv2.ellipse(img7, (380, 270), (100, 65), 20, 0, 360, (20, 78, 188), -1)
    img7 = cv2.GaussianBlur(img7, (13, 13), 0)
    f7 = os.path.join(out_dir, "corrosion_01_severe_patch.jpg")
    cv2.imwrite(f7, img7)
    ground_truth.append({
        "filename": "corrosion_01_severe_patch.jpg",
        "category": "corrosion",
        "expected_defect": "Pitting Corrosion",
        "expected_severity": "SEVERE",
        "has_defect": True,
        "bbox_gt": [185, 145, 485, 345],
        "description": "Severe iron-oxide oxidation rust patches on pump casing."
    })

    # Sample 8: Deep Pitting Micro-Clusters
    img8 = np.full((500, 650, 3), (140, 145, 150), dtype=np.uint8)
    noise8 = np.random.normal(0, 9, (500, 650, 3)).astype(np.int16)
    img8 = np.clip(img8.astype(np.int16) + noise8, 0, 255).astype(np.uint8)
    # Clustered dark rust pitting
    cluster_centers = [(280, 210), (305, 235), (265, 250), (330, 220), (290, 270), (340, 260)]
    for cx, cy in cluster_centers:
        cv2.circle(img8, (cx, cy), np.random.randint(15, 30), (28, 65, 170), -1)
    img8 = cv2.GaussianBlur(img8, (9, 9), 0)
    f8 = os.path.join(out_dir, "corrosion_02_deep_pitting.jpg")
    cv2.imwrite(f8, img8)
    ground_truth.append({
        "filename": "corrosion_02_deep_pitting.jpg",
        "category": "corrosion",
        "expected_defect": "Pitting Corrosion",
        "expected_severity": "SEVERE",
        "has_defect": True,
        "bbox_gt": [245, 190, 365, 295],
        "description": "Dense micro-pitting clusters with active rust bleeding."
    })

    # Sample 9: Galvanic Interface Corrosion
    img9 = np.full((500, 650, 3), (130, 135, 140), dtype=np.uint8)
    noise9 = np.random.normal(0, 8, (500, 650, 3)).astype(np.int16)
    img9 = np.clip(img9.astype(np.int16) + noise9, 0, 255).astype(np.uint8)
    # Rust band across interface
    for x in range(160, 500, 15):
        y = int(250 + 20 * np.sin(x * 0.03) + np.random.normal(0, 5))
        cv2.circle(img9, (x, y), np.random.randint(22, 40), (22, 72, 178), -1)
    img9 = cv2.GaussianBlur(img9, (11, 11), 0)
    f9 = os.path.join(out_dir, "corrosion_03_galvanic_band.jpg")
    cv2.imwrite(f9, img9)
    ground_truth.append({
        "filename": "corrosion_03_galvanic_band.jpg",
        "category": "corrosion",
        "expected_defect": "Pitting Corrosion",
        "expected_severity": "SEVERE",
        "has_defect": True,
        "bbox_gt": [140, 215, 520, 295],
        "description": "Galvanic corrosion band along dissimilar metal gasket boundary."
    })

    # Sample 10: Cavitation Pitting with Rust Halos
    img10 = np.full((500, 650, 3), (135, 140, 145), dtype=np.uint8)
    noise10 = np.random.normal(0, 10, (500, 650, 3)).astype(np.int16)
    img10 = np.clip(img10.astype(np.int16) + noise10, 0, 255).astype(np.uint8)
    cv2.ellipse(img10, (320, 240), (95, 60), -15, 0, 360, (26, 75, 185), -1)
    img10 = cv2.GaussianBlur(img10, (11, 11), 0)
    f10 = os.path.join(out_dir, "corrosion_04_cavitation_rust.jpg")
    cv2.imwrite(f10, img10)
    ground_truth.append({
        "filename": "corrosion_04_cavitation_rust.jpg",
        "category": "corrosion",
        "expected_defect": "Pitting Corrosion",
        "expected_severity": "SEVERE",
        "has_defect": True,
        "bbox_gt": [220, 175, 420, 305],
        "description": "Hydrodynamic cavitation pitting with heavy iron-oxide staining."
    })

    # Sample 11: Acid Vapor Surface Oxidation
    img11 = np.full((500, 650, 3), (120, 125, 130), dtype=np.uint8)
    noise11 = np.random.normal(0, 11, (500, 650, 3)).astype(np.int16)
    img11 = np.clip(img11.astype(np.int16) + noise11, 0, 255).astype(np.uint8)
    cv2.circle(img11, (340, 250), 105, (24, 70, 182), -1)
    img11 = cv2.GaussianBlur(img11, (15, 15), 0)
    f11 = os.path.join(out_dir, "corrosion_05_acid_oxidation.jpg")
    cv2.imwrite(f11, img11)
    ground_truth.append({
        "filename": "corrosion_05_acid_oxidation.jpg",
        "category": "corrosion",
        "expected_defect": "Pitting Corrosion",
        "expected_severity": "SEVERE",
        "has_defect": True,
        "bbox_gt": [230, 140, 450, 360],
        "description": "Chemical vapor oxidation pit on cast housing surface."
    })

    # Sample 12: Crevice Rust on Flange Margin
    img12 = np.full((500, 650, 3), (145, 150, 155), dtype=np.uint8)
    noise12 = np.random.normal(0, 9, (500, 650, 3)).astype(np.int16)
    img12 = np.clip(img12.astype(np.int16) + noise12, 0, 255).astype(np.uint8)
    cv2.ellipse(img12, (260, 230), (85, 45), -30, 0, 360, (20, 80, 190), -1)
    img12 = cv2.GaussianBlur(img12, (9, 9), 0)
    f12 = os.path.join(out_dir, "corrosion_06_crevice_rust.jpg")
    cv2.imwrite(f12, img12)
    ground_truth.append({
        "filename": "corrosion_06_crevice_rust.jpg",
        "category": "corrosion",
        "expected_defect": "Pitting Corrosion",
        "expected_severity": "SEVERE",
        "has_defect": True,
        "bbox_gt": [170, 180, 350, 280],
        "description": "Localized crevice rust along flange seating interface."
    })

    # =========================================================================
    # 3. MECHANICAL WEAR SPALLING (6 Test Samples)
    # =========================================================================

    # Sample 13: Flaking Craters & Micro-Pitting
    img13 = np.full((500, 650, 3), (165, 170, 175), dtype=np.uint8)
    noise13 = np.random.normal(0, 9, (500, 650, 3)).astype(np.int16)
    img13 = np.clip(img13.astype(np.int16) + noise13, 0, 255).astype(np.uint8)
    pits13 = [(210, 190), (250, 220), (290, 185), (330, 240), (380, 205), (410, 260)]
    for px, py in pits13:
        cv2.circle(img13, (px, py), np.random.randint(10, 18), (35, 40, 45), -1)
        cv2.circle(img13, (px, py), np.random.randint(4, 8), (15, 18, 22), -1)
    f13 = os.path.join(out_dir, "spalling_01_flaking_craters.jpg")
    cv2.imwrite(f13, img13)
    ground_truth.append({
        "filename": "spalling_01_flaking_craters.jpg",
        "category": "wear_spalling",
        "expected_defect": "Wear Spalling",
        "expected_severity": "MODERATE",
        "has_defect": True,
        "bbox_gt": [195, 170, 425, 275],
        "description": "Material fatigue flaking craters and micro-spalling on drive flange."
    })

    # Sample 14: Multi-Pit Raceway Spall
    img14 = np.full((500, 650, 3), (170, 175, 180), dtype=np.uint8)
    noise14 = np.random.normal(0, 8, (500, 650, 3)).astype(np.int16)
    img14 = np.clip(img14.astype(np.int16) + noise14, 0, 255).astype(np.uint8)
    pits14 = [(230, 250), (270, 245), (310, 255), (350, 250), (390, 260)]
    for px, py in pits14:
        cv2.circle(img14, (px, py), np.random.randint(12, 19), (30, 35, 40), -1)
        cv2.circle(img14, (px, py), np.random.randint(4, 7), (12, 15, 18), -1)
    f14 = os.path.join(out_dir, "spalling_02_raceway_track.jpg")
    cv2.imwrite(f14, img14)
    ground_truth.append({
        "filename": "spalling_02_raceway_track.jpg",
        "category": "wear_spalling",
        "expected_defect": "Wear Spalling",
        "expected_severity": "MODERATE",
        "has_defect": True,
        "bbox_gt": [215, 230, 405, 275],
        "description": "Subsurface shear spall track along rolling contact path."
    })

    # Sample 15: Heavy Roller Indentation Craters
    img15 = np.full((500, 650, 3), (160, 165, 170), dtype=np.uint8)
    noise15 = np.random.normal(0, 10, (500, 650, 3)).astype(np.int16)
    img15 = np.clip(img15.astype(np.int16) + noise15, 0, 255).astype(np.uint8)
    pits15 = [(270, 190), (320, 230), (360, 180), (300, 280), (350, 290)]
    for px, py in pits15:
        cv2.circle(img15, (px, py), np.random.randint(14, 22), (28, 32, 38), -1)
        cv2.circle(img15, (px, py), np.random.randint(5, 9), (10, 12, 15), -1)
    f15 = os.path.join(out_dir, "spalling_03_roller_indentation.jpg")
    cv2.imwrite(f15, img15)
    ground_truth.append({
        "filename": "spalling_03_roller_indentation.jpg",
        "category": "wear_spalling",
        "expected_defect": "Wear Spalling",
        "expected_severity": "MODERATE",
        "has_defect": True,
        "bbox_gt": [250, 165, 380, 310],
        "description": "Heavy debris-dented spalling craters on load bearing raceway."
    })

    # Sample 16: Surface Delamination Wear
    img16 = np.full((500, 650, 3), (168, 172, 178), dtype=np.uint8)
    noise16 = np.random.normal(0, 8, (500, 650, 3)).astype(np.int16)
    img16 = np.clip(img16.astype(np.int16) + noise16, 0, 255).astype(np.uint8)
    pits16 = [(240, 210), (280, 215), (320, 205), (360, 225)]
    for px, py in pits16:
        cv2.circle(img16, (px, py), np.random.randint(11, 17), (32, 38, 44), -1)
        cv2.circle(img16, (px, py), np.random.randint(3, 6), (14, 16, 20), -1)
    f16 = os.path.join(out_dir, "spalling_04_delamination.jpg")
    cv2.imwrite(f16, img16)
    ground_truth.append({
        "filename": "spalling_04_delamination.jpg",
        "category": "wear_spalling",
        "expected_defect": "Wear Spalling",
        "expected_severity": "MODERATE",
        "has_defect": True,
        "bbox_gt": [225, 195, 375, 240],
        "description": "Superficial material delamination flaking under tangential sliding friction."
    })

    # Sample 17: Bearing Ball Spall Indentation
    img17 = np.full((500, 650, 3), (175, 180, 185), dtype=np.uint8)
    noise17 = np.random.normal(0, 8, (500, 650, 3)).astype(np.int16)
    img17 = np.clip(img17.astype(np.int16) + noise17, 0, 255).astype(np.uint8)
    pits17 = [(290, 240), (330, 250), (310, 280)]
    for px, py in pits17:
        cv2.circle(img17, (px, py), np.random.randint(12, 18), (30, 36, 42), -1)
        cv2.circle(img17, (px, py), np.random.randint(4, 7), (12, 14, 18), -1)
    f17 = os.path.join(out_dir, "spalling_05_ball_spall.jpg")
    cv2.imwrite(f17, img17)
    ground_truth.append({
        "filename": "spalling_05_ball_spall.jpg",
        "category": "wear_spalling",
        "expected_defect": "Wear Spalling",
        "expected_severity": "MODERATE",
        "has_defect": True,
        "bbox_gt": [275, 225, 345, 295],
        "description": "Focal contact fatigue spall on rolling element."
    })

    # Sample 18: Mechanical Chatter Scuffing
    img18 = np.full((500, 650, 3), (162, 166, 172), dtype=np.uint8)
    noise18 = np.random.normal(0, 9, (500, 650, 3)).astype(np.int16)
    img18 = np.clip(img18.astype(np.int16) + noise18, 0, 255).astype(np.uint8)
    pits18 = [(220, 230), (260, 225), (300, 235), (340, 230), (380, 240), (420, 235)]
    for px, py in pits18:
        cv2.circle(img18, (px, py), np.random.randint(10, 16), (32, 38, 44), -1)
        cv2.circle(img18, (px, py), np.random.randint(3, 6), (14, 16, 20), -1)
    f18 = os.path.join(out_dir, "spalling_06_chatter_wear.jpg")
    cv2.imwrite(f18, img18)
    ground_truth.append({
        "filename": "spalling_06_chatter_wear.jpg",
        "category": "wear_spalling",
        "expected_defect": "Wear Spalling",
        "expected_severity": "MODERATE",
        "has_defect": True,
        "bbox_gt": [205, 215, 435, 255],
        "description": "Chatter vibration micro-pitting craters across mounting face."
    })

    # =========================================================================
    # 4. NEGATIVE CONTROLS / HEALTHY NOMINAL COMPONENTS (6 Test Samples)
    # =========================================================================

    # Sample 19: Mirror Polished Stainless Raceway
    img19 = np.full((500, 650, 3), (195, 200, 205), dtype=np.uint8)
    noise19 = np.random.normal(0, 3, (500, 650, 3)).astype(np.int16)
    img19 = np.clip(img19.astype(np.int16) + noise19, 0, 255).astype(np.uint8)
    f19 = os.path.join(out_dir, "healthy_01_mirror_raceway.jpg")
    cv2.imwrite(f19, img19)
    ground_truth.append({
        "filename": "healthy_01_mirror_raceway.jpg",
        "category": "healthy",
        "expected_defect": "None",
        "expected_severity": "NEGLIGIBLE",
        "has_defect": False,
        "bbox_gt": [],
        "description": "Nominal mirror-finish bearing raceway with zero surface defects."
    })

    # Sample 20: Machined Flange with Lathe Marks
    img20 = np.full((500, 650, 3), (175, 180, 185), dtype=np.uint8)
    # Uniform parallel fine turning lines
    for r in range(0, 500, 12):
        cv2.line(img20, (0, r), (650, r), (180, 185, 190), 1)
    noise20 = np.random.normal(0, 4, (500, 650, 3)).astype(np.int16)
    img20 = np.clip(img20.astype(np.int16) + noise20, 0, 255).astype(np.uint8)
    f20 = os.path.join(out_dir, "healthy_02_machined_flange.jpg")
    cv2.imwrite(f20, img20)
    ground_truth.append({
        "filename": "healthy_02_machined_flange.jpg",
        "category": "healthy",
        "expected_defect": "None",
        "expected_severity": "NEGLIGIBLE",
        "has_defect": False,
        "bbox_gt": [],
        "description": "Precision lathe-turned mounting face with standard Ra 1.6 finish."
    })

    # Sample 21: Brushed Aluminium Casing
    img21 = np.full((500, 650, 3), (185, 190, 195), dtype=np.uint8)
    for c in range(0, 650, 8):
        cv2.line(img21, (c, 0), (c, 500), (180, 185, 190), 1)
    noise21 = np.random.normal(0, 4, (500, 650, 3)).astype(np.int16)
    img21 = np.clip(img21.astype(np.int16) + noise21, 0, 255).astype(np.uint8)
    f21 = os.path.join(out_dir, "healthy_03_brushed_casing.jpg")
    cv2.imwrite(f21, img21)
    ground_truth.append({
        "filename": "healthy_03_brushed_casing.jpg",
        "category": "healthy",
        "expected_defect": "None",
        "expected_severity": "NEGLIGIBLE",
        "has_defect": False,
        "bbox_gt": [],
        "description": "Nominal brushed aluminium housing with uniform linear texture."
    })

    # Sample 22: Precision Ground Shaft
    img22 = np.full((500, 650, 3), (180, 183, 188), dtype=np.uint8)
    noise22 = np.random.normal(0, 3, (500, 650, 3)).astype(np.int16)
    img22 = np.clip(img22.astype(np.int16) + noise22, 0, 255).astype(np.uint8)
    f22 = os.path.join(out_dir, "healthy_04_ground_shaft.jpg")
    cv2.imwrite(f22, img22)
    ground_truth.append({
        "filename": "healthy_04_ground_shaft.jpg",
        "category": "healthy",
        "expected_defect": "None",
        "expected_severity": "NEGLIGIBLE",
        "has_defect": False,
        "bbox_gt": [],
        "description": "Nominal centerless-ground shaft journal with nominal tolerances."
    })

    # Sample 23: Coated Epoxy Volute
    img23 = np.full((500, 650, 3), (110, 115, 120), dtype=np.uint8)
    noise23 = np.random.normal(0, 5, (500, 650, 3)).astype(np.int16)
    img23 = np.clip(img23.astype(np.int16) + noise23, 0, 255).astype(np.uint8)
    f23 = os.path.join(out_dir, "healthy_05_coated_volute.jpg")
    cv2.imwrite(f23, img23)
    ground_truth.append({
        "filename": "healthy_05_coated_volute.jpg",
        "category": "healthy",
        "expected_defect": "None",
        "expected_severity": "NEGLIGIBLE",
        "has_defect": False,
        "bbox_gt": [],
        "description": "Pristine industrial epoxy barrier coating with zero rust breakthrough."
    })

    # Sample 24: Pristine Roller Element
    img24 = np.full((500, 650, 3), (190, 195, 200), dtype=np.uint8)
    noise24 = np.random.normal(0, 3, (500, 650, 3)).astype(np.int16)
    img24 = np.clip(img24.astype(np.int16) + noise24, 0, 255).astype(np.uint8)
    f24 = os.path.join(out_dir, "healthy_06_clean_roller.jpg")
    cv2.imwrite(f24, img24)
    ground_truth.append({
        "filename": "healthy_06_clean_roller.jpg",
        "category": "healthy",
        "expected_defect": "None",
        "expected_severity": "NEGLIGIBLE",
        "has_defect": False,
        "bbox_gt": [],
        "description": "Factory-new cylindrical roller element with perfect microgeometry."
    })

    # Write Ground Truth JSON
    gt_path = os.path.join(base_dir, "benchmark_data", "ground_truth.json")
    with open(gt_path, "w") as f:
        json.dump(ground_truth, f, indent=2)

    print(f"Generated {len(ground_truth)} benchmark images in {out_dir}")
    print(f"Ground truth catalog saved to {gt_path}")

if __name__ == "__main__":
    create_benchmark_suite()
