import { useEffect, useRef, useState } from 'react';
import { Building, BuildingType } from '../types/game';
import { BUILDING_DEFS } from '../data/gameData';
interface AcademyMapProps {
 buildings: Building[];
 onBuildingClick?: (building: Building) => void;
 selectedBuilding?: BuildingType | null;
}
export function AcademyMap({ buildings, onBuildingClick, selectedBuilding }: AcademyMapProps) {
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const containerRef = useRef<HTMLDivElement>(null);
 const [hoveredBuilding, setHoveredBuilding] = useState<Building | null>(null);
 const [canvasSize, setCanvasSize] = useState({ width: 800, height: 550 });
 const animationRef = useRef<number>(0);
 const particlesRef = useRef<Array<{
 x: number;
 y: number;
 vx: number;
 vy: number;
 life: number;
 color: string;
 }>>([]);
 useEffect(() => {
 const handleResize = () => {
 if (containerRef.current) {
 const width = Math.min(containerRef.current.clientWidth, 900);
 const height = Math.floor(width * 0.65);
 setCanvasSize({ width, height });
 }
 };
 handleResize();
 window.addEventListener('resize', handleResize);
 return () => window.removeEventListener('resize', handleResize);
 }, []);
 useEffect(() => {
 const canvas = canvasRef.current;
 if (!canvas)
 return;
 const ctx = canvas.getContext('2d');
 if (!ctx)
 return;
 let time = 0;
 const draw = () => {
 time += 0.016;
 const { width, height } = canvasSize;
 ctx.clearRect(0, 0, width, height);
 drawBackground(ctx, width, height, time);
 drawBuildings(ctx, buildings, width, height, time, selectedBuilding ?? null, hoveredBuilding);
 drawParticles(ctx, width, height);
 updateParticles(width, height);
 animationRef.current = requestAnimationFrame(draw);
 };
 draw();
 return () => cancelAnimationFrame(animationRef.current);
 }, [buildings, canvasSize, selectedBuilding, hoveredBuilding]);
 const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
 const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
 skyGradient.addColorStop(0, '#1a1a3e');
 skyGradient.addColorStop(0.4, '#2d1b4e');
 skyGradient.addColorStop(0.7, '#4a2c6a');
 skyGradient.addColorStop(1, '#1a3a2a');
 ctx.fillStyle = skyGradient;
 ctx.fillRect(0, 0, width, height);
 for (let i = 0; i < 80; i++) {
 const x = (i * 137.5 + time * 5) % width;
 const y = (i * 53.7) % (height * 0.5);
 const size = 0.5 + Math.sin(time * 2 + i) * 0.5;
 const alpha = 0.3 + Math.sin(time * 3 + i * 0.7) * 0.3;
 ctx.beginPath();
 ctx.arc(x, y, size, 0, Math.PI * 2);
 ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
 ctx.fill();
 }
 const groundGradient = ctx.createLinearGradient(0, height * 0.55, 0, height);
 groundGradient.addColorStop(0, '#2d5a3d');
 groundGradient.addColorStop(0.5, '#1e4a2e');
 groundGradient.addColorStop(1, '#0f3a1f');
 ctx.fillStyle = groundGradient;
 ctx.fillRect(0, height * 0.55, width, height * 0.45);
 for (let i = 0; i < 15; i++) {
 const pathX = (i / 15) * width + Math.sin(time * 0.5 + i) * 20;
 const pathY = height * 0.65 + i * 15;
 ctx.beginPath();
 ctx.ellipse(pathX, pathY, 60, 8, 0, 0, Math.PI * 2);
 ctx.fillStyle = 'rgba(139, 119, 101, 0.2)';
 ctx.fill();
 }
 const moonX = width * 0.85;
 const moonY = height * 0.12;
 const moonGlow = ctx.createRadialGradient(moonX, moonY, 5, moonX, moonY, 60);
 moonGlow.addColorStop(0, 'rgba(255, 240, 200, 0.4)');
 moonGlow.addColorStop(1, 'rgba(255, 240, 200, 0)');
 ctx.fillStyle = moonGlow;
 ctx.fillRect(moonX - 60, moonY - 60, 120, 120);
 ctx.beginPath();
 ctx.arc(moonX, moonY, 25, 0, Math.PI * 2);
 ctx.fillStyle = '#fff8dc';
 ctx.fill();
 };
 const drawBuildings = (ctx: CanvasRenderingContext2D, buildings: Building[], width: number, height: number, time: number, selected: BuildingType | null, hovered: Building | null) => {
 const scaleX = width / 800;
 const scaleY = height / 550;
 for (const building of buildings) {
 const bx = building.x * scaleX;
 const by = building.y * scaleY;
 const bw = 90 * scaleX;
 const bh = 100 * scaleY;
 const isSelected = selected === building.type;
 const isHovered = hovered?.type === building.type;
 const def = BUILDING_DEFS[building.type];
 if (isSelected || isHovered) {
 const pulse = Math.sin(time * 4) * 0.3 + 0.7;
 ctx.shadowColor = isSelected ? '#ffd700' : '#ffffff';
 ctx.shadowBlur = 20 * pulse;
 }
 if (!building.constructed) {
 ctx.globalAlpha = 0.5;
 ctx.setLineDash([5, 5]);
 }
 drawBuildingShape(ctx, bx, by, bw, bh, building.type, building.level, time, scaleX, scaleY);
 ctx.setLineDash([]);
 ctx.globalAlpha = 1;
 ctx.shadowBlur = 0;
 ctx.font = `${Math.floor(32 * scaleX)}px serif`;
 ctx.textAlign = 'center';
 ctx.textBaseline = 'middle';
 ctx.fillText(def.icon, bx + bw / 2, by + bh * 0.35);
 ctx.font = `bold ${Math.floor(12 * scaleX)}px sans-serif`;
 ctx.fillStyle = building.constructed ? '#ffffff' : '#aaaaaa';
 ctx.fillText(def.name, bx + bw / 2, by + bh + 8);
 if (building.level > 0) {
 ctx.font = `bold ${Math.floor(11 * scaleX)}px sans-serif`;
 const lvlBgW = 40 * scaleX;
 const lvlBgH = 18 * scaleY;
 ctx.fillStyle = 'rgba(0,0,0,0.6)';
 roundRect(ctx, bx + bw / 2 - lvlBgW / 2, by - lvlBgH - 2, lvlBgW, lvlBgH, 4);
 ctx.fill();
 ctx.fillStyle = '#ffd700';
 ctx.fillText(`Lv.${building.level}`, bx + bw / 2, by - lvlBgH / 2 - 2);
 }
 }
 };
 const drawBuildingShape = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: BuildingType, level: number, time: number, sx: number, sy: number) => {
 const colors = getBuildingColors(type, level);
 ctx.fillStyle = colors.wall;
 roundRect(ctx, x, y + h * 0.2, w, h * 0.8, 8);
 ctx.fill();
 ctx.fillStyle = colors.roof;
 ctx.beginPath();
 ctx.moveTo(x - 5 * sx, y + h * 0.25);
 ctx.lineTo(x + w / 2, y);
 ctx.lineTo(x + w + 5 * sx, y + h * 0.25);
 ctx.closePath();
 ctx.fill();
 ctx.fillStyle = colors.window;
 const winW = 10 * sx;
 const winH = 14 * sy;
 for (let row = 0; row < 2; row++) {
 for (let col = 0; col < 3; col++) {
 const wx = x + 12 * sx + col * (w - 24 * sx) / 2;
 const wy = y + h * 0.35 + row * (h * 0.25);
 const glow = Math.sin(time * 2 + row + col) * 0.15 + 0.85;
 ctx.shadowColor = colors.window;
 ctx.shadowBlur = 5 * glow;
 ctx.fillStyle = colors.window;
 roundRect(ctx, wx, wy, winW, winH, 2);
 ctx.fill();
 ctx.shadowBlur = 0;
 }
 }
 ctx.fillStyle = '#4a3728';
 const doorW = 18 * sx;
 const doorH = 28 * sy;
 roundRect(ctx, x + w / 2 - doorW / 2, y + h - doorH, doorW, doorH, 3);
 ctx.fill();
 if (level >= 3) {
 ctx.fillStyle = '#ffd700';
 ctx.fillRect(x + w / 2 - 3, y - 25 * sy, 3, 25 * sy);
 ctx.beginPath();
 ctx.moveTo(x + w / 2, y - 25 * sy);
 ctx.lineTo(x + w / 2 + 18 * sx, y - 18 * sy);
 ctx.lineTo(x + w / 2, y - 11 * sy);
 ctx.closePath();
 ctx.fill();
 }
 if (level >= 5) {
 const towerX = type === 'magic_tower' ? x + w / 2 : x + w - 10 * sx;
 const towerW = 20 * sx;
 ctx.fillStyle = colors.wall;
 roundRect(ctx, towerX - towerW / 2, y - 10 * sy, towerW, h * 0.4, 5);
 ctx.fill();
 ctx.fillStyle = colors.roof;
 ctx.beginPath();
 ctx.moveTo(towerX - towerW / 2 - 3, y - 10 * sy);
 ctx.lineTo(towerX, y - 35 * sy);
 ctx.lineTo(towerX + towerW / 2 + 3, y - 10 * sy);
 ctx.closePath();
 ctx.fill();
 }
 };
 const getBuildingColors = (type: BuildingType, level: number) => {
 const baseColors: Record<BuildingType, {
 wall: string;
 roof: string;
 window: string;
 }> = {
 main_hall: { wall: '#8b7355', roof: '#654321', window: '#ffd700' },
 dormitory: { wall: '#a0826d', roof: '#8b4513', window: '#87ceeb' },
 library: { wall: '#6b5b73', roof: '#4a3a5a', window: '#dda0dd' },
 classroom: { wall: '#7b8b9a', roof: '#4a5568', window: '#98fb98' },
 training_ground: { wall: '#8b6914', roof: '#5a4510', window: '#ffa500' },
 alchemy_lab: { wall: '#5a7a6a', roof: '#2a4a3a', window: '#00ff7f' },
 magic_tower: { wall: '#4a4a7a', roof: '#2a2a5a', window: '#ff00ff' },
 warehouse: { wall: '#7a6a5a', roof: '#4a3a2a', window: '#ffff00' },
 };
 const colors = baseColors[type];
 if (level >= 7) {
 return {
 wall: lightenColor(colors.wall, 20),
 roof: lightenColor(colors.roof, 20),
 window: '#ffffff',
 };
 }
 return colors;
 };
 const lightenColor = (hex: string, percent: number): string => {
 const num = parseInt(hex.replace('#', ''), 16);
 const amt = Math.round(2.55 * percent);
 const R = Math.min(255, (num >> 16) + amt);
 const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
 const B = Math.min(255, (num & 0x0000ff) + amt);
 return '#' + ((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1);
 };
 const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
 ctx.beginPath();
 ctx.moveTo(x + r, y);
 ctx.lineTo(x + w - r, y);
 ctx.quadraticCurveTo(x + w, y, x + w, y + r);
 ctx.lineTo(x + w, y + h - r);
 ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
 ctx.lineTo(x + r, y + h);
 ctx.quadraticCurveTo(x, y + h, x, y + h - r);
 ctx.lineTo(x, y + r);
 ctx.quadraticCurveTo(x, y, x + r, y);
 ctx.closePath();
 };
 const updateParticles = (width: number, height: number) => {
 if (Math.random() < 0.05 && particlesRef.current.length < 30) {
 particlesRef.current.push({
 x: Math.random() * width,
 y: height * 0.5 + Math.random() * height * 0.3,
 vx: (Math.random() - 0.5) * 0.5,
 vy: -0.3 - Math.random() * 0.5,
 life: 1,
 color: `hsl(${50 + Math.random() * 30}, 80%, 70%)`,
 });
 }
 particlesRef.current = particlesRef.current.filter((p) => {
 p.x += p.vx;
 p.y += p.vy;
 p.life -= 0.008;
 return p.life > 0;
 });
 };
 const drawParticles = (ctx: CanvasRenderingContext2D, _width: number, _height: number) => {
 for (const p of particlesRef.current) {
 ctx.beginPath();
 ctx.arc(p.x, p.y, 2 * p.life, 0, Math.PI * 2);
 ctx.fillStyle = p.color;
 ctx.globalAlpha = p.life;
 ctx.fill();
 ctx.globalAlpha = 1;
 }
 };
 const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
 if (!onBuildingClick)
 return;
 const canvas = canvasRef.current;
 if (!canvas)
 return;
 const rect = canvas.getBoundingClientRect();
 const scaleX = canvas.width / rect.width;
 const scaleY = canvas.height / rect.height;
 const x = ((e.clientX - rect.left) * scaleX) / (canvas.width / 800);
 const y = ((e.clientY - rect.top) * scaleY) / (canvas.height / 550);
 for (const building of buildings) {
 const bw = 90;
 const bh = 120;
 if (x >= building.x &&
 x <= building.x + bw &&
 y >= building.y - 20 &&
 y <= building.y + bh) {
 onBuildingClick(building);
 return;
 }
 }
 };
 const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
 const canvas = canvasRef.current;
 if (!canvas)
 return;
 const rect = canvas.getBoundingClientRect();
 const scaleX = canvas.width / rect.width;
 const scaleY = canvas.height / rect.height;
 const x = ((e.clientX - rect.left) * scaleX) / (canvas.width / 800);
 const y = ((e.clientY - rect.top) * scaleY) / (canvas.height / 550);
 let found: Building | null = null;
 for (const building of buildings) {
 const bw = 90;
 const bh = 120;
 if (x >= building.x &&
 x <= building.x + bw &&
 y >= building.y - 20 &&
 y <= building.y + bh) {
 found = building;
 break;
 }
 }
 setHoveredBuilding(found);
 };
 return (<div ref={containerRef} className="w-full rounded-xl overflow-hidden border-2 border-purple-800 shadow-2xl">
 <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} onClick={handleCanvasClick} onMouseMove={handleCanvasMove} onMouseLeave={() => setHoveredBuilding(null)} className="cursor-pointer block w-full" style={{ imageRendering: 'auto' }}/>
 {hoveredBuilding && (<div className="absolute top-4 left-4 bg-black/80 text-white p-3 rounded-lg text-sm backdrop-blur-sm border border-purple-500/50 max-w-xs">
 <div className="flex items-center gap-2 mb-1">
 <span className="text-2xl">{BUILDING_DEFS[hoveredBuilding.type].icon}</span>
 <span className="font-bold text-yellow-400">{BUILDING_DEFS[hoveredBuilding.type].name}</span>
 {hoveredBuilding.level > 0 && (<span className="bg-yellow-600 px-2 py-0.5 rounded text-xs">Lv.{hoveredBuilding.level}</span>)}
 </div>
 <p className="text-gray-300 text-xs">{BUILDING_DEFS[hoveredBuilding.type].description}</p>
 {!hoveredBuilding.constructed && (<p className="text-orange-400 text-xs mt-1">⚠ 尚未建造</p>)}
 </div>)}
 </div>);
}

