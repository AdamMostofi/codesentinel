import zipfile
import os
import shutil
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class FileHandler:
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir)
        self.upload_dir = self.base_dir
        self.upload_dir.mkdir(exist_ok=True)
        logger.info(f"FileHandler initialized with upload_dir: {self.upload_dir}")

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
            logger.warning(f"Invalid file type: {filename}")
            raise ValueError("Only .zip files are allowed")

        # Validate size (50MB max)
        if len(file_content) > 50 * 1024 * 1024:
            logger.warning(f"File too large: {filename} ({len(file_content)} bytes)")
            raise ValueError("File size must be less than 50MB")

        # Create scan-specific directory
        scan_dir = self.upload_dir / scan_id
        scan_dir.mkdir(exist_ok=True)
        logger.info(f"Created scan directory: {scan_dir}")

        # Save zip file
        zip_path = scan_dir / filename
        with open(zip_path, "wb") as f:
            f.write(file_content)
        logger.info(f"Saved zip file: {zip_path}")

        # Extract zip
        extract_dir = scan_dir / "extracted"
        extract_dir.mkdir(exist_ok=True)

        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(extract_dir)

        logger.info(f"Extracted files to: {extract_dir}")

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
            logger.info(f"Cleaned up scan directory: {scan_dir}")
