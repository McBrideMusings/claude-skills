"""
Xcode build execution.

Handles xcodebuild command construction and execution with xcresult generation.
"""

import re
import subprocess
import sys
from pathlib import Path

from .cache import XCResultCache


class BuildRunner:
    """
    Execute xcodebuild commands with xcresult bundle generation.

    Handles scheme auto-detection, command construction, and build/test execution.
    """

    def __init__(
        self,
        project_path: str | None = None,
        workspace_path: str | None = None,
        scheme: str | None = None,
        configuration: str = "Debug",
        cache: XCResultCache | None = None,
    ):
        """
        Initialize build runner.

        Args:
            project_path: Path to .xcodeproj
            workspace_path: Path to .xcworkspace
            scheme: Build scheme (auto-detected if not provided)
            configuration: Build configuration (Debug/Release)
            cache: XCResult cache (creates default if not provided)
        """
        self.project_path = project_path
        self.workspace_path = workspace_path
        self.scheme = scheme
        self.configuration = configuration
        self.cache = cache or XCResultCache()

    def auto_detect_scheme(self) -> str | None:
        """
        Auto-detect build scheme from project/workspace.

        Returns:
            Detected scheme name or None
        """
        cmd = ["xcodebuild", "-list"]

        if self.workspace_path:
            cmd.extend(["-workspace", self.workspace_path])
        elif self.project_path:
            cmd.extend(["-project", self.project_path])
        else:
            return None

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)

            # Parse schemes from output
            in_schemes_section = False
            for line in result.stdout.split("\n"):
                line = line.strip()

                if "Schemes:" in line:
                    in_schemes_section = True
                    continue

                if in_schemes_section and line and not line.startswith("Build"):
                    # First scheme in list
                    return line

        except subprocess.CalledProcessError as e:
            print(f"Error auto-detecting scheme: {e}", file=sys.stderr)

        return None

    def get_simulator_destination(self, needs_device: bool) -> str:
        """
        Get xcodebuild destination string.

        A build needs no device, so it targets the generic simulator platform and boots
        nothing. A test run needs one, and every simulator on this machine comes from the
        machine-wide pool: `~/.claude/tools/sim acquire` waits for a free slot and prints the
        UDID of a device this session leases (the same one on every call).

        Returns:
            Destination string for -destination flag
        """
        if not needs_device:
            return "generic/platform=iOS Simulator"
        sim = Path.home() / ".claude" / "tools" / "sim"
        result = subprocess.run([str(sim), "acquire"], capture_output=True, text=True, check=False)
        if result.returncode != 0:
            raise RuntimeError(f"sim acquire failed (exit {result.returncode}): {result.stderr.strip()}")
        return f"id={result.stdout.strip()}"

    def build(self, clean: bool = False) -> tuple[bool, str, str]:
        """
        Build the project.

        Args:
            clean: Perform clean build

        Returns:
            Tuple of (success: bool, xcresult_id: str, stderr: str)
        """
        # Auto-detect scheme if needed
        if not self.scheme:
            self.scheme = self.auto_detect_scheme()
            if not self.scheme:
                print("Error: Could not auto-detect scheme. Use --scheme", file=sys.stderr)
                return (False, "", "")

        # Generate xcresult ID and path
        xcresult_id = self.cache.generate_id()
        xcresult_path = self.cache.get_path(xcresult_id)

        # Build command
        cmd = ["xcodebuild", "-quiet"]  # Suppress verbose output

        if clean:
            cmd.append("clean")

        cmd.append("build")

        if self.workspace_path:
            cmd.extend(["-workspace", self.workspace_path])
        elif self.project_path:
            cmd.extend(["-project", self.project_path])
        else:
            print("Error: No project or workspace specified", file=sys.stderr)
            return (False, "", "")

        cmd.extend(
            [
                "-scheme",
                self.scheme,
                "-configuration",
                self.configuration,
                "-destination",
                self.get_simulator_destination(needs_device=False),
                "-resultBundlePath",
                str(xcresult_path),
            ]
        )

        # Execute build
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, check=False  # Don't raise on non-zero exit
            )

            success = result.returncode == 0

            # xcresult bundle should be created even on failure
            if not xcresult_path.exists():
                print("Warning: xcresult bundle was not created", file=sys.stderr)
                return (success, "", result.stderr)


            return (success, xcresult_id, result.stderr)

        except Exception as e:
            print(f"Error executing build: {e}", file=sys.stderr)
            return (False, "", str(e))

    def test(self, test_suite: str | None = None) -> tuple[bool, str, str]:
        """
        Run tests.

        Args:
            test_suite: Specific test suite to run

        Returns:
            Tuple of (success: bool, xcresult_id: str, stderr: str)
        """
        # Auto-detect scheme if needed
        if not self.scheme:
            self.scheme = self.auto_detect_scheme()
            if not self.scheme:
                print("Error: Could not auto-detect scheme. Use --scheme", file=sys.stderr)
                return (False, "", "")

        # Generate xcresult ID and path
        xcresult_id = self.cache.generate_id()
        xcresult_path = self.cache.get_path(xcresult_id)

        # Build command
        cmd = ["xcodebuild", "-quiet", "test"]

        if self.workspace_path:
            cmd.extend(["-workspace", self.workspace_path])
        elif self.project_path:
            cmd.extend(["-project", self.project_path])
        else:
            print("Error: No project or workspace specified", file=sys.stderr)
            return (False, "", "")

        try:
            destination = self.get_simulator_destination(needs_device=True)
        except RuntimeError as e:
            print(f"Error: {e}", file=sys.stderr)
            return (False, "", str(e))

        # Parallel testing boots stock "Clone N of" devices beside the leased one.
        cmd.extend(
            [
                "-scheme",
                self.scheme,
                "-destination",
                destination,
                "-parallel-testing-enabled",
                "NO",
                "-resultBundlePath",
                str(xcresult_path),
            ]
        )

        if test_suite:
            cmd.extend(["-only-testing", test_suite])

        # Execute tests
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=False)

            success = result.returncode == 0

            # xcresult bundle should be created even on failure
            if not xcresult_path.exists():
                print("Warning: xcresult bundle was not created", file=sys.stderr)
                return (success, "", result.stderr)


            return (success, xcresult_id, result.stderr)

        except Exception as e:
            print(f"Error executing tests: {e}", file=sys.stderr)
            return (False, "", str(e))
