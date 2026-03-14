import zipfile
import os
import shutil
from pathlib import Path


class FileHandler:
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir)
        self.upload_dir = self.base_dir
        self.upload_dir.mkdir(exist_ok=True)

    def handle_upload(self, file_content: bytes, filename: str, scan_id: str) -> dict:
        """
        Handle file upload, validation, and extraction.

        Args:
            file_content: Raw bytes of the uploaded file
            filename: Original filename
            scan_id: Unique identifier for this scan

        Returns:
            dict with paths: zip_path, extract_dir, scan_dir
        """
        # Validate .zip extension
        if not filename.endswith(".zip"):
            raise ValueError("Only .zip files are allowed")

        # Validate size (50MB max)
        if len(file_content) > 50 * 1024 * 1024:
            raise ValueError("File size must be less than 50MB")

        # Create scan-specific directory
        scan_dir = self.upload_dir / scan_id
        scan_dir.mkdir(exist_ok=True)

        # Save zip file
        zip_path = scan_dir / filename
        with open(zip_path, "wb") as f:
            f.write(file_content)

        # Extract zip
        extract_dir = scan_dir / "extracted"
        extract_dir.mkdir(exist_ok=True)

        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(extract_dir)

        return {
            "zip_path": str(zip_path),
            "extract_dir": str(extract_dir),
            "scan_dir": str(scan_dir),
        }

    def cleanup(self, scan_id: str):
        """Remove uploaded files for a scan"""
        scan_dir = self.upload_dir / scan_id
        if scan_dir.exists():
            shutil.rmtree(scan_dir)
