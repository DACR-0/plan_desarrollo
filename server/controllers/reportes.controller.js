const db          = require('../config/db');
const PDFDocument = require('pdfkit');
const ExcelJS     = require('exceljs');

// ── Helpers ─────────────────────────────────────────────────
function statusColor(pct) {
  const p = parseFloat(pct) || 0;
  return p >= 90 ? '#16a34a' : p >= 50 ? '#ca8a04' : '#dc2626';
}
function statusArgb(pct) {
  const p = parseFloat(pct) || 0;
  return p >= 90 ? 'FF16A34A' : p >= 50 ? 'FFCA8A04' : 'FFDC2626';
}
function statusLabel(pct) {
  const p = parseFloat(pct) || 0;
  return p >= 90 ? 'En Meta' : p >= 50 ? 'En Progreso' : 'En Riesgo';
}
function n(v) { return v !== null && v !== undefined ? v : 0; }
function trunc(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ── Data loader ──────────────────────────────────────────────
async function getPlanData(planId) {
  const [[plan]] = await db.query('SELECT * FROM planes WHERE id = ?', [planId]);
  if (!plan) return null;

  const [[kpis]] = await db.query(`
    SELECT
      ROUND(COALESCE(AVG(i.porcentaje_cumplimiento), 0), 2) AS avance_global,
      COUNT(DISTINCT i.id)  AS total_indicadores,
      COUNT(DISTINCT ae.id) AS total_areas,
      COUNT(DISTINCT og.id) AS total_og,
      COUNT(DISTINCT oe.id) AS total_oe,
      COUNT(DISTINCT m.id)  AS total_metas,
      SUM(CASE WHEN i.porcentaje_cumplimiento >= 90                                    THEN 1 ELSE 0 END) AS en_meta,
      SUM(CASE WHEN i.porcentaje_cumplimiento >= 50 AND i.porcentaje_cumplimiento < 90 THEN 1 ELSE 0 END) AS en_progreso,
      SUM(CASE WHEN i.porcentaje_cumplimiento <  50                                    THEN 1 ELSE 0 END) AS en_riesgo
    FROM areas_estrategicas ae
    LEFT JOIN objetivos_generales   og ON og.area_id                = ae.id  AND og.activo = TRUE
    LEFT JOIN objetivos_especificos oe ON oe.objetivo_general_id    = og.id  AND oe.activo = TRUE
    LEFT JOIN metas                 m  ON m.objetivo_especifico_id  = oe.id  AND m.activo  = TRUE
    LEFT JOIN indicadores           i  ON i.meta_id                 = m.id   AND i.activo  = TRUE
    WHERE ae.plan_id = ? AND ae.activo = TRUE
  `, [planId]);

  const [areas] = await db.query(`
    SELECT ae.id, ae.codigo, ae.nombre, ae.descripcion, ae.orden,
           ROUND(COALESCE(AVG(i.porcentaje_cumplimiento), 0), 2) AS avance,
           COUNT(DISTINCT i.id) AS total_indicadores
    FROM areas_estrategicas ae
    LEFT JOIN objetivos_generales   og ON og.area_id               = ae.id AND og.activo = TRUE
    LEFT JOIN objetivos_especificos oe ON oe.objetivo_general_id   = og.id AND oe.activo = TRUE
    LEFT JOIN metas                 m  ON m.objetivo_especifico_id = oe.id AND m.activo  = TRUE
    LEFT JOIN indicadores           i  ON i.meta_id                = m.id  AND i.activo  = TRUE
    WHERE ae.plan_id = ? AND ae.activo = TRUE
    GROUP BY ae.id ORDER BY ae.orden
  `, [planId]);

  const [ogs] = await db.query(`
    SELECT og.id, og.nombre, og.codigo, og.descripcion,
           ae.id AS area_id, ae.codigo AS area_codigo,
           ROUND(COALESCE(AVG(i.porcentaje_cumplimiento), 0), 2) AS avance,
           COUNT(DISTINCT i.id) AS total_indicadores
    FROM objetivos_generales og
    JOIN areas_estrategicas ae ON ae.id = og.area_id AND ae.activo = TRUE
    LEFT JOIN objetivos_especificos oe ON oe.objetivo_general_id   = og.id AND oe.activo = TRUE
    LEFT JOIN metas                 m  ON m.objetivo_especifico_id = oe.id AND m.activo  = TRUE
    LEFT JOIN indicadores           i  ON i.meta_id                = m.id  AND i.activo  = TRUE
    WHERE ae.plan_id = ? AND og.activo = TRUE
    GROUP BY og.id ORDER BY ae.orden, og.id
  `, [planId]);

  const [oes] = await db.query(`
    SELECT oe.id, oe.nombre, oe.codigo,
           og.id AS og_id, og.codigo AS og_codigo,
           ae.id AS area_id,
           ROUND(COALESCE(AVG(i.porcentaje_cumplimiento), 0), 2) AS avance,
           COUNT(DISTINCT i.id) AS total_indicadores
    FROM objetivos_especificos oe
    JOIN objetivos_generales og ON og.id = oe.objetivo_general_id AND og.activo = TRUE
    JOIN areas_estrategicas  ae ON ae.id = og.area_id             AND ae.activo = TRUE
    LEFT JOIN metas       m ON m.objetivo_especifico_id = oe.id AND m.activo = TRUE
    LEFT JOIN indicadores i ON i.meta_id                = m.id  AND i.activo = TRUE
    WHERE ae.plan_id = ? AND oe.activo = TRUE
    GROUP BY oe.id ORDER BY ae.orden, og.id, oe.id
  `, [planId]);

  const [metas] = await db.query(`
    SELECT m.id, m.nombre, m.linea_base, m.valor_meta, m.unidad_medida,
           oe.id AS oe_id, oe.codigo AS oe_codigo,
           og.id AS og_id, ae.id AS area_id,
           ROUND(COALESCE(AVG(i.porcentaje_cumplimiento), 0), 2) AS avance,
           COUNT(DISTINCT i.id) AS total_indicadores
    FROM metas m
    JOIN objetivos_especificos oe ON oe.id = m.objetivo_especifico_id AND oe.activo = TRUE
    JOIN objetivos_generales   og ON og.id = oe.objetivo_general_id   AND og.activo = TRUE
    JOIN areas_estrategicas    ae ON ae.id = og.area_id               AND ae.activo = TRUE
    LEFT JOIN indicadores i ON i.meta_id = m.id AND i.activo = TRUE
    WHERE ae.plan_id = ? AND m.activo = TRUE
    GROUP BY m.id ORDER BY ae.orden, og.id, oe.id, m.id
  `, [planId]);

  const [indicadores] = await db.query(`
    SELECT i.id, i.nombre, i.formula, i.unidad_medida,
           i.linea_base, i.valor_meta, i.valor_actual, i.porcentaje_cumplimiento, i.periodo_calculo,
           m.id AS meta_id, m.nombre AS meta_nombre,
           oe.id AS oe_id, oe.nombre AS oe_nombre, oe.codigo AS oe_codigo,
           og.id AS og_id, og.nombre AS og_nombre, og.codigo AS og_codigo,
           ae.id AS area_id, ae.nombre AS area_nombre, ae.codigo AS area_codigo
    FROM indicadores i
    JOIN metas                 m  ON m.id  = i.meta_id
    JOIN objetivos_especificos oe ON oe.id = m.objetivo_especifico_id
    JOIN objetivos_generales   og ON og.id = oe.objetivo_general_id
    JOIN areas_estrategicas    ae ON ae.id = og.area_id
    WHERE ae.plan_id = ? AND i.activo = TRUE
    ORDER BY ae.orden, og.id, oe.id, m.id, i.id
  `, [planId]);

  const [variables] = await db.query(
    'SELECT id, nombre, descripcion, valor_actual, unidad FROM variables WHERE plan_id = ? AND activo = TRUE ORDER BY nombre',
    [planId]
  );

  return { plan, kpis, areas, ogs, oes, metas, indicadores, variables };
}

// ── PDF ──────────────────────────────────────────────────────
const exportPDF = async (req, res) => {
  try {
    const data = await getPlanData(req.params.plan_id);
    if (!data) return res.status(404).json({ success: false, message: 'Plan no encontrado' });

    const { plan, kpis, areas, indicadores, variables } = data;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-pdu-${plan.id}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    const PAGE_W = doc.page.width;
    const L = 50;
    const R = PAGE_W - 50;
    const W = R - L;

    // ── Encabezado ──────────────────────────────────────
    doc.fontSize(20).fillColor('#1e3a8a').text('SIGEPU', L, 50, { width: W, align: 'center' });
    doc.y = 74;
    doc.fontSize(9.5).fillColor('#6b7280')
       .text('Sistema de Gestión del Plan de Desarrollo Universitario', { align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(L, doc.y).lineTo(R, doc.y).strokeColor('#1e3a8a').lineWidth(1.5).stroke();
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor('#111827').text(plan.nombre, { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(9).fillColor('#6b7280').text(
      `Vigencia: ${plan.anio_inicio} – ${plan.anio_fin}  ·  Generado: ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      { align: 'center' }
    );
    doc.moveDown(1.2);

    // ── KPIs ────────────────────────────────────────────
    const kpiY  = doc.y;
    const kpiW  = Math.floor(W / 4);
    const kpiItems = [
      { label: 'Avance Global',    value: `${n(kpis.avance_global)}%`, color: statusColor(kpis.avance_global) },
      { label: 'Indicadores',      value: n(kpis.total_indicadores),   color: '#1e3a8a' },
      { label: 'En Meta (≥90%)',   value: n(kpis.en_meta),             color: '#16a34a' },
      { label: 'En Riesgo (<50%)', value: n(kpis.en_riesgo),           color: '#dc2626' },
    ];
    kpiItems.forEach((k, i) => {
      const kx = L + i * kpiW;
      doc.rect(kx + 2, kpiY,     kpiW - 4, 52).fillColor('#f8fafc').fill();
      doc.rect(kx + 2, kpiY,     kpiW - 4,  3).fillColor(k.color).fill();
      doc.fontSize(20).fillColor(k.color)
         .text(String(k.value), kx + 2, kpiY + 8, { width: kpiW - 4, align: 'center', lineBreak: false });
      doc.fontSize(7.5).fillColor('#6b7280')
         .text(k.label, kx + 2, kpiY + 34, { width: kpiW - 4, align: 'center', lineBreak: false });
    });
    doc.y = kpiY + 58;

    doc.fontSize(8).fillColor('#374151').text(
      `Áreas: ${n(kpis.total_areas)}  ·  Obj. Generales: ${n(kpis.total_og)}  ·  Obj. Específicos: ${n(kpis.total_oe)}  ·  Metas: ${n(kpis.total_metas)}`,
      { align: 'center' }
    );
    doc.moveDown(1);

    // ── Avance por Área ─────────────────────────────────
    doc.fontSize(11).fillColor('#1e3a8a').text('▌ Avance por Área Estratégica');
    doc.moveDown(0.4);

    const LABEL_W = Math.floor(W * 0.40);
    const BAR_W   = Math.floor(W * 0.44);
    const PCT_OFF = LABEL_W + BAR_W + 10;

    areas.forEach(a => {
      if (doc.y > 705) doc.addPage();
      const ry    = doc.y;
      const pct   = parseFloat(a.avance) || 0;
      const color = statusColor(pct);
      const fillW = Math.max(2, Math.min((pct / 100) * BAR_W, BAR_W));

      doc.fontSize(8.5).fillColor('#111827')
         .text(trunc(`${a.codigo} – ${a.nombre}`, 55), L, ry, { width: LABEL_W, lineBreak: false });

      const barX = L + LABEL_W + 6;
      const barY = ry + 1;
      doc.rect(barX, barY, BAR_W, 9).fillColor('#e5e7eb').fill();
      doc.rect(barX, barY, fillW,  9).fillColor(color).fill();

      doc.fontSize(8.5).fillColor(color)
         .text(`${pct}%`, L + PCT_OFF, ry, { width: W - PCT_OFF, lineBreak: false });

      doc.y = ry + 18;
    });

    doc.moveDown(0.6);
    doc.moveTo(L, doc.y).lineTo(R, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    doc.moveDown(0.8);

    // ── Indicadores por Área ────────────────────────────
    doc.fontSize(11).fillColor('#1e3a8a').text('▌ Detalle de Indicadores por Área');
    doc.moveDown(0.5);

    const byArea = {};
    areas.forEach(a => { byArea[a.id] = { area: a, inds: [] }; });
    indicadores.forEach(ind => { if (byArea[ind.area_id]) byArea[ind.area_id].inds.push(ind); });

    let indNum = 1;
    for (const { area, inds } of Object.values(byArea)) {
      if (!inds.length) continue;
      if (doc.y > 680) doc.addPage();

      // Area header bar
      const aY = doc.y;
      doc.rect(L, aY, W, 18).fillColor('#1e3a8a').fill();
      doc.fontSize(9).fillColor('#ffffff')
         .text(trunc(`${area.codigo} – ${area.nombre}`, 65), L + 5, aY + 4, { width: W - 130, lineBreak: false });
      doc.fontSize(9).fillColor('#ffffff')
         .text(`Avance: ${area.avance}%  (${statusLabel(area.avance)})`, R - 125, aY + 4, { width: 120, align: 'right', lineBreak: false });
      doc.y = aY + 22;

      inds.forEach((ind, idx) => {
        const ROW_H = 52;
        if (doc.y > 695) doc.addPage();
        const ry    = doc.y;
        const pct   = parseFloat(ind.porcentaje_cumplimiento) || 0;
        const color = statusColor(pct);

        if (idx % 2 === 0) doc.rect(L, ry, W, ROW_H).fillColor('#f8fafc').fill();

        // Badge
        const BW = 54;
        doc.rect(R - BW, ry + 13, BW, 22).fillColor(color).fill();
        doc.fontSize(10).fillColor('#ffffff')
           .text(`${pct}%`, R - BW, ry + 16, { width: BW, align: 'center', lineBreak: false });
        doc.fontSize(7).fillColor('#ffffff')
           .text(statusLabel(pct), R - BW, ry + 28, { width: BW, align: 'center', lineBreak: false });

        // Text
        const TW = W - BW - 12;
        doc.fontSize(9).fillColor('#111827')
           .text(`${indNum}. ${trunc(ind.nombre, 72)}`, L + 5, ry + 3, { width: TW, lineBreak: false });
        doc.fontSize(7.5).fillColor('#6b7280')
           .text(`Meta: ${trunc(ind.meta_nombre, 80)}`, L + 5, ry + 15, { width: TW, lineBreak: false });
        doc.fontSize(7.5).fillColor('#374151')
           .text(`Fórmula: ${trunc(ind.formula, 75)}`, L + 5, ry + 25, { width: TW, lineBreak: false });
        doc.fontSize(7.5).fillColor('#6b7280')
           .text(`LB: ${n(ind.linea_base)}  |  Meta: ${n(ind.valor_meta)}  |  Actual: ${n(ind.valor_actual)}  |  Unidad: ${ind.unidad_medida || '—'}`,
                 L + 5, ry + 35, { width: TW, lineBreak: false });
        doc.fontSize(7.5).fillColor('#9ca3af')
           .text(`OE: ${trunc(ind.oe_codigo || '—', 20)}  /  OG: ${trunc(ind.og_codigo || '—', 20)}  /  Período: ${ind.periodo_calculo || '—'}`,
                 L + 5, ry + 43, { width: TW, lineBreak: false });

        doc.y = ry + ROW_H + 1;
        indNum++;
      });

      doc.moveDown(0.4);
    }

    // ── Variables ────────────────────────────────────────
    if (variables.length) {
      if (doc.y > 560) doc.addPage();
      doc.moveDown(0.3);
      doc.moveTo(L, doc.y).lineTo(R, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      doc.moveDown(0.7);
      doc.fontSize(11).fillColor('#1e3a8a').text('▌ Variables del Plan');
      doc.moveDown(0.4);

      const VN = 125, VD = W - 125 - 70 - 60, VV = 70, VU = 60;
      const vHdrY = doc.y;
      doc.rect(L, vHdrY, W, 15).fillColor('#374151').fill();

      let vhx = L + 4;
      [['Nombre (en fórmula)', VN], ['Descripción', VD], ['Valor Actual', VV], ['Unidad', VU]]
        .forEach(([h, w]) => {
          doc.fontSize(7.5).fillColor('#ffffff').text(h, vhx, vHdrY + 3, { width: w, lineBreak: false });
          vhx += w;
        });
      doc.y = vHdrY + 18;

      variables.forEach((v, idx) => {
        const ROW_H = 14;
        if (doc.y > 725) doc.addPage();
        const vy = doc.y;
        if (idx % 2 === 0) doc.rect(L, vy, W, ROW_H).fillColor('#f3f4f6').fill();

        let vcx = L + 4;
        [[v.nombre, VN], [trunc(v.descripcion || '—', 55), VD],
         [String(n(v.valor_actual)), VV], [v.unidad || '—', VU]]
          .forEach(([val, w]) => {
            doc.fontSize(7.5).fillColor('#111827').text(val, vcx, vy + 3, { width: w, lineBreak: false });
            vcx += w;
          });
        doc.y = vy + ROW_H;
      });
    }

    // Footer
    doc.moveDown(1);
    doc.moveTo(L, doc.y).lineTo(R, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    doc.moveDown(0.3);
    doc.fontSize(7).fillColor('#9ca3af')
       .text(`SIGEPU – Generado el ${new Date().toLocaleString('es-CO')}`, L, doc.y, { width: W, align: 'center' });

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent)
      res.status(500).json({ success: false, message: 'Error generando PDF' });
  }
};

// ── Excel ────────────────────────────────────────────────────
const exportExcel = async (req, res) => {
  try {
    const data = await getPlanData(req.params.plan_id);
    if (!data) return res.status(404).json({ success: false, message: 'Plan no encontrado' });

    const { plan, kpis, areas, ogs, oes, metas, indicadores, variables } = data;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SIGEPU';
    wb.created = new Date();

    const bdr = {
      top:    { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left:   { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right:  { style: 'thin', color: { argb: 'FFD1D5DB' } },
    };

    function hdrRow(ws, rowNum) {
      const row = ws.getRow(rowNum);
      row.font   = { bold: true, color: { argb: 'FFFFFFFF' } };
      row.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      row.height = 20;
      row.alignment = { vertical: 'middle' };
      row.eachCell(c => { c.border = bdr; });
    }

    function dataRow(row, idx) {
      row.height = 16;
      row.eachCell(c => {
        c.border = bdr;
        c.alignment = { vertical: 'middle' };
      });
      if (idx % 2 === 1)
        row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }; });
    }

    function badgeCells(row, cols) {
      cols.forEach(col => {
        const cell = typeof col === 'number' ? row.getCell(col) : row.getCell(col);
        const pct  = parseFloat(cell.value) || 0;
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusArgb(pct) } };
        cell.font  = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    }

    // ── Hoja 1: Resumen ──────────────────────────────────
    const ws1 = wb.addWorksheet('Resumen');

    ws1.mergeCells('A1:D1');
    ws1.getCell('A1').value     = `SIGEPU – ${plan.nombre}`;
    ws1.getCell('A1').font      = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
    ws1.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    ws1.getRow(1).height = 32;

    ws1.mergeCells('A2:D2');
    ws1.getCell('A2').value     = `Vigencia: ${plan.anio_inicio} – ${plan.anio_fin}  |  Generado: ${new Date().toLocaleDateString('es-CO')}`;
    ws1.getCell('A2').alignment = { horizontal: 'center' };
    ws1.getCell('A2').font      = { color: { argb: 'FF6B7280' } };

    ws1.addRow([]);

    ws1.addRow(['Indicador de Plan', 'Valor']);
    hdrRow(ws1, 4);

    const kpiRows = [
      ['Avance Global (%)',                n(kpis.avance_global)],
      ['Total Áreas Estratégicas',         n(kpis.total_areas)],
      ['Total Objetivos Generales',        n(kpis.total_og)],
      ['Total Objetivos Específicos',      n(kpis.total_oe)],
      ['Total Metas',                      n(kpis.total_metas)],
      ['Total Indicadores',                n(kpis.total_indicadores)],
      ['Indicadores en Meta (≥90%)',       n(kpis.en_meta)],
      ['Indicadores en Progreso (50–89%)', n(kpis.en_progreso)],
      ['Indicadores en Riesgo (<50%)',     n(kpis.en_riesgo)],
    ];
    kpiRows.forEach((r, i) => {
      const row = ws1.addRow(r);
      dataRow(row, i);
    });
    // Color global avance cell
    const globalRow = ws1.getRow(5);
    const globalCell = globalRow.getCell(2);
    globalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusArgb(kpis.avance_global) } };
    globalCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    ws1.addRow([]);

    const areaHdrRow = ws1.addRow(['Área Estratégica', 'Código', 'Indicadores', 'Avance (%)', 'Estado']);
    hdrRow(ws1, ws1.rowCount);
    areas.forEach((a, i) => {
      const row = ws1.addRow([a.nombre, a.codigo, a.total_indicadores, a.avance, statusLabel(a.avance)]);
      dataRow(row, i);
      [4, 5].forEach(col => {
        row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusArgb(a.avance) } };
        row.getCell(col).font = { bold: col === 4, color: { argb: 'FFFFFFFF' } };
        row.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    ws1.columns = [{ width: 50 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 16 }];

    // ── Hoja 2: Indicadores ──────────────────────────────
    const ws2 = wb.addWorksheet('Indicadores');
    ws2.addRow([
      'Área Estratégica', 'Obj. General', 'Obj. Específico', 'Meta',
      'Indicador', 'Fórmula', 'Unidad', 'Línea Base',
      'Valor Meta', 'Valor Actual', 'Cumplimiento (%)', 'Estado', 'Período',
    ]);
    hdrRow(ws2, 1);

    indicadores.forEach((ind, i) => {
      const pct = parseFloat(ind.porcentaje_cumplimiento) || 0;
      const row = ws2.addRow([
        `${ind.area_codigo} – ${ind.area_nombre}`,
        `${ind.og_codigo || ''} ${ind.og_nombre}`.trim(),
        `${ind.oe_codigo || ''} ${ind.oe_nombre}`.trim(),
        ind.meta_nombre,
        ind.nombre,
        ind.formula,
        ind.unidad_medida || '',
        n(ind.linea_base),
        n(ind.valor_meta),
        n(ind.valor_actual),
        pct,
        statusLabel(pct),
        ind.periodo_calculo || '',
      ]);
      dataRow(row, i);
      [11, 12].forEach(col => {
        row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusArgb(pct) } };
        row.getCell(col).font = { bold: col === 11, color: { argb: 'FFFFFFFF' } };
        row.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    ws2.columns = [
      { width: 28 }, { width: 30 }, { width: 30 }, { width: 35 },
      { width: 40 }, { width: 35 }, { width: 12 }, { width: 12 },
      { width: 12 }, { width: 14 }, { width: 16 }, { width: 14 }, { width: 14 },
    ];

    // ── Hoja 3: Jerarquía (OG → OE → Meta) ──────────────
    const ws3 = wb.addWorksheet('Jerarquía');
    ws3.addRow(['Nivel', 'Código', 'Nombre / Descripción', 'Indicadores', 'Avance (%)', 'Estado']);
    hdrRow(ws3, 1);

    areas.forEach(area => {
      // Area row
      const aRow = ws3.addRow(['Área Estratégica', area.codigo, area.nombre, area.total_indicadores, area.avance, statusLabel(area.avance)]);
      aRow.font = { bold: true, color: { argb: 'FF1E3A8A' } };
      aRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
      aRow.eachCell(c => { c.border = bdr; });
      [5, 6].forEach(col => {
        aRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusArgb(area.avance) } };
        aRow.getCell(col).font = { bold: col === 5, color: { argb: 'FFFFFFFF' } };
        aRow.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
      });

      ogs.filter(og => og.area_id === area.id).forEach((og, ogi) => {
        const ogRow = ws3.addRow(['  Obj. General', og.codigo || '', og.nombre, og.total_indicadores, og.avance, statusLabel(og.avance)]);
        ogRow.font = { bold: true };
        if (ogi % 2 === 0) ogRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } };
        ogRow.eachCell(c => { c.border = bdr; });
        [5, 6].forEach(col => {
          ogRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusArgb(og.avance) } };
          ogRow.getCell(col).font = { bold: col === 5, color: { argb: 'FFFFFFFF' } };
          ogRow.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
        });

        oes.filter(oe => oe.og_id === og.id).forEach((oe, oei) => {
          const oeRow = ws3.addRow(['    Obj. Específico', oe.codigo || '', oe.nombre, oe.total_indicadores, oe.avance, statusLabel(oe.avance)]);
          oeRow.getCell(1).font = { italic: true, color: { argb: 'FF374151' } };
          if (oei % 2 === 0) oeRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          oeRow.eachCell(c => { c.border = bdr; });
          [5, 6].forEach(col => {
            oeRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusArgb(oe.avance) } };
            oeRow.getCell(col).font = { bold: col === 5, color: { argb: 'FFFFFFFF' } };
            oeRow.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
          });

          metas.filter(m => m.oe_id === oe.id).forEach((m, mi) => {
            const mRow = ws3.addRow(['      Meta', '', m.nombre, m.total_indicadores, m.avance, statusLabel(m.avance)]);
            mRow.getCell(1).font = { italic: true, color: { argb: 'FF6B7280' } };
            mRow.eachCell(c => { c.border = bdr; });
            [5, 6].forEach(col => {
              mRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusArgb(m.avance) } };
              mRow.getCell(col).font = { bold: col === 5, color: { argb: 'FFFFFFFF' } };
              mRow.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
            });
          });
        });
      });
    });

    ws3.columns = [{ width: 20 }, { width: 14 }, { width: 55 }, { width: 14 }, { width: 14 }, { width: 16 }];

    // ── Hoja 4: Variables ────────────────────────────────
    const ws4 = wb.addWorksheet('Variables');
    ws4.addRow(['Nombre (en fórmula)', 'Descripción', 'Valor Actual', 'Unidad']);
    hdrRow(ws4, 1);

    variables.forEach((v, i) => {
      const row = ws4.addRow([v.nombre, v.descripcion || '', n(v.valor_actual), v.unidad || '']);
      dataRow(row, i);
      row.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(1).font      = { name: 'Courier New', size: 10 };
    });

    ws4.columns = [{ width: 28 }, { width: 55 }, { width: 16 }, { width: 16 }];

    // ── Enviar ───────────────────────────────────────────
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-pdu-${plan.id}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent)
      res.status(500).json({ success: false, message: 'Error generando Excel' });
  }
};

module.exports = { exportPDF, exportExcel };
