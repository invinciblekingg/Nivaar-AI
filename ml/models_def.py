"""
Udyon -- Neural Network Architectures for Predictive Maintenance
Defines PyTorch modules for:
1. Vibration1DCNN: 1D-CNN for high-frequency raw vibration time-series (CWRU benchmark)
2. NEUSurfaceCNN: 2D-CNN for manufacturing steel defect classification (NEU-CLS benchmark)
"""

import torch
import torch.nn as nn

class Vibration1DCNN(nn.Module):
    """
    1D-CNN for high-frequency accelerometer vibration fault diagnosis.
    Processes 1,024-step raw time-series directly across 4 motor states:
    [Normal, Inner_Race_Fault, Ball_Fault, Outer_Race_Fault]
    """
    def __init__(self, num_classes=4):
        super().__init__()
        self.conv_stack = nn.Sequential(
            nn.Conv1d(1, 16, kernel_size=15, stride=2, padding=7),
            nn.BatchNorm1d(16),
            nn.ReLU(),
            nn.MaxPool1d(2),
            
            nn.Conv1d(16, 32, kernel_size=7, stride=2, padding=3),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.MaxPool1d(2),
            
            nn.Conv1d(32, 64, kernel_size=5, stride=2, padding=2),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.AdaptiveAvgPool1d(4)
        )
        self.fc = nn.Sequential(
            nn.Linear(64 * 4, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, num_classes)
        )

    def forward(self, x):
        # x: (batch, 1, 1024)
        feats = self.conv_stack(x)
        feats = feats.view(feats.size(0), -1)
        return self.fc(feats)

class NEUSurfaceCNN(nn.Module):
    """
    Convolutional network tailored for industrial steel strip defect classification (200x200 grayscale).
    Detects fine crazing cracks, roll scale, inclusions, patches, pitting, and scratches.
    Classes: ["crazing", "inclusion", "patches", "pitted_surface", "rolled-in_scale", "scratches"]
    """
    def __init__(self, num_classes=6):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=5, stride=2, padding=2),
            nn.BatchNorm2d(16),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(16, 32, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((4, 4))
        )
        self.classifier = nn.Sequential(
            nn.Linear(64 * 4 * 4, 128),
            nn.ReLU(),
            nn.Dropout(0.4),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        f = self.features(x)
        f = f.view(f.size(0), -1)
        return self.classifier(f)

class CrackDetectorCNN(nn.Module):
    """
    Dedicated deep convolutional network for crack vs sound surface classification.
    Optimized for multi-scale crack detection on structural infrastructure, concrete,
    road surfaces, and industrial machinery components.
    Classes: [0: sound_surface, 1: structural_crack]
    """
    def __init__(self):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 24, kernel_size=5, stride=2, padding=2),
            nn.BatchNorm2d(24),
            nn.LeakyReLU(0.1),
            nn.MaxPool2d(2),
            nn.Conv2d(24, 48, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(48),
            nn.LeakyReLU(0.1),
            nn.MaxPool2d(2),
            nn.Conv2d(48, 96, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(96),
            nn.LeakyReLU(0.1),
            nn.AdaptiveAvgPool2d((4, 4))
        )
        self.classifier = nn.Sequential(
            nn.Linear(96 * 4 * 4, 128),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.3),
            nn.Linear(128, 2)
        )

    def forward(self, x):
        f = self.features(x)
        f = f.view(f.size(0), -1)
        return self.classifier(f)

