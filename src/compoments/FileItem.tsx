import { Button, ListGroup, ProgressBar } from "react-bootstrap";
import "./FileItem.css";
import { useCallback, useEffect, useState } from "react";

export type FileStatus =
	| "ready"
	| "waiting"
	| "converting"
	| "converted"
	| "error";

export interface FileItemInfo {
	data: File;
	status: FileStatus;
	progress: number;
	convertedBlob?: Blob;
	error?: string;
}

const ActionButton = ({
	id,
	file,
	handleDownloadFile,
	handleFileRemove,
}: {
	id: number;
	file: FileItemInfo;
	handleDownloadFile: (id: number) => void;
	handleFileRemove: (id: number) => void;
}) => {
	const [label, setLabel] = useState<string>("");
	const [variant, setVariant] = useState<string>("");

	const handleActionLayerClick = () => {
		const handlerMap = {
			ready: handleFileRemove,
			waiting: undefined,
			converting: undefined,
			converted: handleDownloadFile,
			error: handleFileRemove,
		};

		const handler = handlerMap[file.status];

		if (handler) {
			handler(id);
		}
	};

	useEffect(() => {
		const variantMap = {
			ready: "outline-secondary",
			waiting: "outline-secondary",
			converting: "outline-secondary",
			converted: "outline-success",
			error: "danger",
		};

		setVariant(variantMap[file.status]);
	}, [file.status]);

	useEffect(() => {
		const labelMap = {
			ready: "-",
			waiting: "..waiting..",
			converting: `${file.progress.toFixed(2)}%`,
			converted: "Download",
			error: "Error",
		};

		setLabel(labelMap[file.status]);
	}, [file.status, file.progress]);

	const handleMouseEnter = useCallback(() => {
		if (file.status === "ready" || file.status === "error") {
			setLabel("Remove");
		}
	}, [file.status]);

	const handleMouseLeave = useCallback(() => {
		if (file.status === "ready") {
			setLabel("-");
		} else if (file.status === "error") {
			setLabel("Error");
		}
	}, [file.status]);

	return (
		<Button
			className="custom-progress-bar-action-layer"
			size="sm"
			variant={variant}
			onClick={handleActionLayerClick}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			style={{
				cursor:
					file.status === "converting" || file.status === "waiting"
						? "wait"
						: "pointer",
			}}
		>
			{label}
		</Button>
	);
};

export const FileItem = ({
	id,
	file,
	handleDownloadFile,
	handleFileRemove,
}: {
	id: number;
	file: FileItemInfo;
	handleDownloadFile: (id: number) => void;
	handleFileRemove: (id: number) => void;
}) => {
	return (
		<ListGroup.Item
			key={id}
			className="d-flex gap-1 justify-content-between align-items-center"
		>
			<span>{file.data.name}</span>
			<div style={{ position: "relative" }}>
				<ProgressBar
					variant="info"
					className="custom-progress-bar"
					data-bs-theme="dark"
					visuallyHidden
					now={file.progress}
					style={{
						visibility: file.status === "converting" ? "visible" : "hidden",
					}}
				/>
				<ActionButton
					id={id}
					file={file}
					handleDownloadFile={handleDownloadFile}
					handleFileRemove={handleFileRemove}
				/>
			</div>
		</ListGroup.Item>
	);
};
