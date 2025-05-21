import type React from "react";
import "./Footer.css";

const Footer: React.FC = () => {
	return (
		<footer className="footer mt-auto py-2 align-items-center d-sm-flex justify-content-center text-center">
			<div>
				Powered by{" "}
				<a
					href="https://github.com/ffmpegwasm/ffmpeg.wasm"
					target="_blank"
					rel="noopener noreferrer"
					className="text-white"
					title="ffmpeg.wasm"
				>
					ffmpeg.wasm
				</a>
			</div>
			<div className="mx-3 d-none d-sm-inline">|</div>
			<a
				href="https://www.flaticon.com/free-icons/change"
				title="change icons"
				className="text-white"
				target="_blank"
				rel="noopener noreferrer"
			>
				Change icons created by Freepik - Flaticon
			</a>
		</footer>
	);
};

export default Footer;
