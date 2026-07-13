"""Structured logging using Loguru."""

import sys
from loguru import logger


def setup_logger(debug: bool = False) -> None:
    """Configure Loguru for structured output."""
    logger.remove()  # Remove default handler

    log_level = "DEBUG" if debug else "INFO"
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "<level>{message}</level>"
    )

    logger.add(
        sys.stdout,
        format=log_format,
        level=log_level,
        colorize=True,
        backtrace=True,
        diagnose=debug,
    )

    logger.add(
        "logs/sellerops_{time:YYYY-MM-DD}.log",
        format=log_format,
        level="INFO",
        rotation="1 day",
        retention="7 days",
        compression="zip",
    )


# Re-export logger for import convenience
__all__ = ["logger", "setup_logger"]
