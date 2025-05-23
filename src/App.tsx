import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import JSZip from "jszip";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	Button,
	Col,
	Container,
	Form,
	ListGroup,
	ProgressBar,
	Row,
} from "react-bootstrap";
import Lottie from "react-lottie";
import logoImage from "./asset/exchange-64.png";
import * as loadingAnimation from "./asset/loading.lottie.json";
import { FileItem } from "./compoments/FileItem";
import type { FileItemInfo, FileStatus } from "./compoments/FileItem";
import Footer from "./compoments/Footer";

function App() {
	const [loaded, setLoaded] = useState(false);
	const ffmpegRef = useRef(new FFmpeg());
	const [filesToConvert, setFilesToConvert] = useState<
		Map<number, FileItemInfo>
	>(new Map());
	const [conversionProgress, setConversionProgress] = useState(0);
	const [convertStatus, setConvertStatus] = useState<
		"idle" | "converting" | "converted"
	>("idle");
	const [selectFormat, setSelectFormat] = useState("");
	const [zipFile, setZipFile] = useState<File>(
		new File([], "converted_files.zip", { type: "application/zip" }),
	);
	const formRef = useRef(null);

	const supportedAudioFormats = [
		"mp3",
		"wav",
		"m4a",
		"flac",
		"aac",
		"ogg",
		"wma",
		"mka",
	];

	const loadingOptions = {
		loop: true,
		autoplay: true,
		animationData: JSON.parse(JSON.stringify(loadingAnimation)),
		rendererSettings: {
			preserveAspectRatio: "xMidYMid slice",
		},
	};

	const load = useCallback(async () => {
		const baseURL = "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm";
		const ffmpeg = ffmpegRef.current;
		await ffmpeg.load({
			coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
			wasmURL: await toBlobURL(
				`${baseURL}/ffmpeg-core.wasm`,
				"application/wasm",
			),
			workerURL: await toBlobURL(
				`${baseURL}/ffmpeg-core.worker.js`,
				"text/javascript",
			),
		});
		setLoaded(true);
	}, []);

	const updateFileStatus = (
		id: number,
		status: FileStatus,
		convertedBlob?: Blob,
		error?: string,
		progress?: number,
	) => {
		const file = filesToConvert.get(id);
		if (!file) return;
		setFilesToConvert(
			new Map(
				filesToConvert.set(id, {
					...file,
					status,
					convertedBlob,
					error,
					progress: progress ?? file.progress,
				}),
			),
		);
		const convertedCount = Array.from(filesToConvert.values()).filter(
			(f) => f.status === "converted",
		).length;
		setConversionProgress((convertedCount / filesToConvert.size) * 100);
	};

	const getFileNameWithoutExtension = (fileName: string) => {
		return fileName.split(".").slice(0, -1).join(".");
	};

	const convertFiles = async (event: React.FormEvent) => {
		event.preventDefault();
		event.stopPropagation();

		setConvertStatus("converting");
		for (const key of filesToConvert.keys()) {
			updateFileStatus(key, "waiting");
		}

		const format = selectFormat;
		const ffmpeg = ffmpegRef.current;
		const zip = new JSZip();

		for (const key of filesToConvert.keys()) {
			try {
				const fileToConvert = filesToConvert.get(key);
				if (!fileToConvert) {
					return;
				}

				updateFileStatus(key, "converting", undefined, undefined, 0);

				const progressHandler = ({ progress }: { progress: number }) => {
					if (filesToConvert.get(key)?.status === "converting") {
						updateFileStatus(
							key,
							"converting",
							undefined,
							undefined,
							progress * 100,
						);
					}
				};

				ffmpeg.on("progress", progressHandler);

				try {
					const file = fileToConvert.data;
					await ffmpeg.writeFile(file.name, await fetchFile(file));
					await ffmpeg.exec(["-i", file.name, `output_${key}.${format}`]);
					const fileData = await ffmpeg.readFile(`output_${key}.${format}`);
					const data = new Uint8Array(fileData as ArrayBuffer);
					const convertedBlob = new Blob([data.buffer], {
						type: `audio/${format}`,
					});
					zip.file(
						`${getFileNameWithoutExtension(file.name)}.${format}`,
						convertedBlob,
					);
					updateFileStatus(key, "converted", convertedBlob, undefined, 100);
				} finally {
					ffmpeg.off("progress", progressHandler);
				}
			} catch (e) {
				const errorMessage =
					e instanceof Error && e.message ? e.message : "Unknown error";
				updateFileStatus(key, "error", undefined, errorMessage);
			}
		}

		const zipBlob = await zip.generateAsync({ type: "blob" });
		setZipFile(
			new File([zipBlob], "converted_files.zip", { type: "application/zip" }),
		);
		setConvertStatus("converted");
	};

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (files && files.length > 0) {
			const fileMap = new Map<number, FileItemInfo>();
			Array.from(files).forEach((file, i) => {
				fileMap.set(i + 1, { data: file, status: "ready", progress: 0 });
			});
			setFilesToConvert(fileMap);
		}

		setConvertStatus("idle");
	};

	const handleFileRemove = (id: number) => {
		const fileMap = new Map(filesToConvert);
		fileMap.delete(id);
		setFilesToConvert(fileMap);
	};

	const handleSelectFormat = (event: React.ChangeEvent<HTMLSelectElement>) => {
		const selectedFormat = event.target.value;
		setSelectFormat(selectedFormat);

		for (const key of filesToConvert.keys()) {
			updateFileStatus(key, "ready", undefined, undefined, 0);
		}

		setConvertStatus("idle");
	};

	const handleDownloadFile = (id: number) => {
		const file = filesToConvert.get(id);
		if (!file || file.status !== "converted" || !file.convertedBlob) return;

		const blob = new Blob([file.convertedBlob], {
			type: file.convertedBlob.type,
		});
		const link = document.createElement("a");
		link.href = window.URL.createObjectURL(blob);
		link.download = `${getFileNameWithoutExtension(
			file.data.name,
		)}.${selectFormat}`;
		link.click();
		window.URL.revokeObjectURL(link.href);
	};

	const handleDownloadAll = () => {
		if (!zipFile) return;
		window.location.href = URL.createObjectURL(zipFile);
	};

	const handleReset = () => {
		setFilesToConvert(new Map());
		setConversionProgress(0);
		setConvertStatus("idle");
		setSelectFormat("");
		setZipFile(
			new File([], "converted_files.zip", { type: "application/zip" }),
		);
	};

	useEffect(() => {
		load();
	}, [load]);

	return (
		<div className="pt-5">
			{loaded ? (
				<Container className="col-md-10 col-lg-6">
					<div className="d-flex justify-content-start align-items-center gap-3">
						<img
							src={logoImage}
							width={36}
							height={36}
							alt="Logo"
							className="align-self-center"
						/>
						<h1 className="align-self-center m-0">Audio Converter</h1>
					</div>

					<Form
						id="convertAudioForm"
						ref={formRef}
						onSubmit={convertFiles}
						data-bs-theme="dark"
						onReset={handleReset}
						className="mt-3"
					>
						<fieldset disabled={convertStatus === "converting"}>
							<Row>
								<Form.Group as={Col} md="8">
									<Form.Label>Sourse files</Form.Label>
									<Form.Control
										required
										type="file"
										placeholder="Select Files"
										accept={supportedAudioFormats.map((f) => `.${f}`).join(",")}
										multiple
										onChange={handleFileChange}
									/>
									<Form.Control.Feedback>Looks good!</Form.Control.Feedback>
								</Form.Group>
								<Form.Group as={Col} md="4">
									<Form.Label>Target Format</Form.Label>
									<Form.Select
										value={selectFormat}
										onChange={handleSelectFormat}
										required
									>
										<option value="">Select a format</option>
										{supportedAudioFormats.map((f) => (
											<option key={f} value={f}>
												{f}
											</option>
										))}
									</Form.Select>
									<Form.Control.Feedback>Looks good!</Form.Control.Feedback>
								</Form.Group>
							</Row>
							{convertStatus === "idle" && (
								<div className="d-grid gap-2">
									<Button className="btn btn-primary mt-3" type="submit">
										Convert
									</Button>
								</div>
							)}
						</fieldset>
					</Form>

					{(convertStatus === "converting" ||
						convertStatus === "converted") && (
						<ProgressBar
							data-bs-theme="dark"
							className="mt-3"
							striped={convertStatus === "converting"}
							animated={convertStatus === "converting"}
							variant="info"
							now={conversionProgress}
							label={`${conversionProgress.toFixed(2)}%`}
						/>
					)}

					{convertStatus === "converted" && (
						<div className="d-md-flex gap-md-3 justify-content-between">
							<Button
								variant="success"
								onClick={handleDownloadAll}
								className="w-100 mt-3"
							>
								Download All
							</Button>
							<Button
								variant="outline-primary"
								type="reset"
								form="convertAudioForm"
								className="mt-3"
							>
								Clear
							</Button>
						</div>
					)}
					<ListGroup
						className="mt-4"
						data-bs-theme="dark"
						style={{ paddingBottom: "100px" }}
					>
						{Array.from(filesToConvert.entries()).map(([id, file]) =>
							FileItem({
								id,
								file,
								handleDownloadFile,
								handleFileRemove,
							}),
						)}
					</ListGroup>
				</Container>
			) : (
				<Container className="mt-5 text-center">
					<Lottie
						options={loadingOptions}
						height={400}
						width={400}
						isClickToPauseDisabled={true}
						style={{ cursor: "default" }}
					/>
				</Container>
			)}

			<Footer />
		</div>
	);
}

export default App;
