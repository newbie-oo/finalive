export function SlipEmptyState() {
	return (
		<div className="flex h-full min-h-[480px] flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-(--border) bg-(--surface) p-10 text-center">
			<p className="text-ui font-medium text-(--foreground)">
				เลือกสลิปจากรายการเพื่อดูรายละเอียด
			</p>
			<p className="text-uism text-(--foreground-muted)">
				คีย์ลัด: <span className="mono">j/k</span> เลื่อน ·{" "}
				<span className="mono">a</span> อนุมัติ · <span className="mono">r</span>{" "}
				ปฏิเสธ · <span className="mono">Esc</span> ปิด
			</p>
		</div>
	);
}
