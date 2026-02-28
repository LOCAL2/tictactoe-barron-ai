'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';

type Piece = 'BP' | 'WP' | 'BK' | 'WK' | null;
type Board = Piece[];

export default function ThaiMakhos() {
  const [board, setBoard] = useState<Board>(initializeBoard());
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameStatus, setGameStatus] = useState<'playing' | 'player-win' | 'ai-win'>('playing');
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [validMoves, setValidMoves] = useState<number[]>([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [mustCaptureFrom, setMustCaptureFrom] = useState<number[]>([]);

  function initializeBoard(): Board {
    const board: Board = Array(64).fill(null);
    
    for (let row = 5; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) board[row * 8 + col] = 'BP';
      }
    }
    
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) board[row * 8 + col] = 'WP';
      }
    }
    
    return board;
  }

  const getPosition = (index: number): [number, number] => [Math.floor(index / 8), index % 8];
  const getIndex = (row: number, col: number): number => row < 0 || row >= 8 || col < 0 || col >= 8 ? -1 : row * 8 + col;
  const isValidSquare = (row: number, col: number): boolean => (row + col) % 2 === 1;

  const getCaptureMoves = useCallback((board: Board, pieceIndex: number): number[] => {
    const piece = board[pieceIndex];
    if (!piece) return [];

    const [row, col] = getPosition(pieceIndex);
    const captures: number[] = [];
    const isKing = piece[1] === 'K';

    const directions = isKing ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : piece[0] === 'B' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];

    for (const [dr, dc] of directions) {
      const jumpRow = row + dr * 2;
      const jumpCol = col + dc * 2;
      const jumpIndex = getIndex(jumpRow, jumpCol);
      
      if (jumpIndex !== -1 && isValidSquare(jumpRow, jumpCol)) {
        const midPiece = board[getIndex(row + dr, col + dc)];
        if (midPiece && midPiece[0] !== piece[0] && !board[jumpIndex]) {
          captures.push(jumpIndex);
        }
      }
    }

    return captures;
  }, []);

  // Load stats from localStorage
  useEffect(() => {
    console.log('🎮 หมากฮอสไทย vs Barron AI - System Initialized');
    
    const savedStats = localStorage.getItem('makhos-stats');
    if (savedStats) {
      try {
        const stats = JSON.parse(savedStats);
        setPlayerScore(stats.playerScore || 0);
        setAiScore(stats.aiScore || 0);
      } catch (error) {
        console.error('Failed to load stats');
      }
    }
  }, []);

  // Save stats to localStorage
  useEffect(() => {
    localStorage.setItem('makhos-stats', JSON.stringify({
      playerScore,
      aiScore
    }));
  }, [playerScore, aiScore]);

  // Check for forced captures when board changes
  useEffect(() => {
    if (gameStatus === 'playing' && isPlayerTurn && !isThinking) {
      const playerPiecesWithCaptures: number[] = [];
      for (let i = 0; i < 64; i++) {
        if (board[i] && board[i]![0] === 'B') {
          if (getCaptureMoves(board, i).length > 0) {
            playerPiecesWithCaptures.push(i);
          }
        }
      }
      setMustCaptureFrom(playerPiecesWithCaptures);
    }
  }, [board, gameStatus, isPlayerTurn, isThinking, getCaptureMoves]);

  const getValidMoves = useCallback((board: Board, pieceIndex: number, capturesOnly: boolean = false): number[] => {
    const piece = board[pieceIndex];
    if (!piece) return [];

    const captures = getCaptureMoves(board, pieceIndex);
    if (capturesOnly || captures.length > 0) return captures;

    const [row, col] = getPosition(pieceIndex);
    const moves: number[] = [];
    const isBlack = piece[0] === 'B';
    const isKing = piece[1] === 'K';

    const directions = isKing ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : isBlack ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];

    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      const newIndex = getIndex(newRow, newCol);
      
      if (newIndex !== -1 && isValidSquare(newRow, newCol) && !board[newIndex]) {
        moves.push(newIndex);
      }
    }

    return moves;
  }, [getCaptureMoves]);

  const evaluateBoard = useCallback((board: Board): number => {
    let score = 0;
    
    for (let i = 0; i < 64; i++) {
      const piece = board[i];
      if (!piece) continue;
      
      const [row] = getPosition(i);
      const isWhite = piece[0] === 'W';
      const isKing = piece[1] === 'K';
      
      let value = isKing ? 300 : 100;
      value += (7 - Math.abs(3.5 - row)) * 10;
      
      if (!isKing) {
        if (isWhite && row > 5) value += 50;
        if (!isWhite && row < 2) value += 50;
      }
      
      score += isWhite ? value : -value;
    }
    
    return score;
  }, []);

  const minimax = useCallback((board: Board, depth: number, alpha: number, beta: number, isMaximizing: boolean): number => {
    if (depth === 0) return evaluateBoard(board);
    
    const pieces = board.map((p, i) => ({ piece: p, index: i }))
      .filter(({ piece }) => piece && (isMaximizing ? piece[0] === 'W' : piece[0] === 'B'));
    
    if (pieces.length === 0) return isMaximizing ? -100000 : 100000;
    
    // Check for forced captures
    const piecesWithCaptures = pieces.filter(({ index }) => getCaptureMoves(board, index).length > 0);
    const activePieces = piecesWithCaptures.length > 0 ? piecesWithCaptures : pieces;
    
    if (isMaximizing) {
      let maxEval = -Infinity;
      
      for (const { index } of activePieces) {
        const moves = getValidMoves(board, index, piecesWithCaptures.length > 0);
        
        for (const move of moves) {
          const newBoard = [...board];
          newBoard[move] = newBoard[index];
          newBoard[index] = null;
          
          const [fromRow, fromCol] = getPosition(index);
          const [toRow, toCol] = getPosition(move);
          if (Math.abs(toRow - fromRow) === 2) {
            newBoard[getIndex((fromRow + toRow) / 2, (fromCol + toCol) / 2)] = null;
          }
          
          if (newBoard[move] === 'WP' && toRow === 7) newBoard[move] = 'WK';
          
          const evaluation = minimax(newBoard, depth - 1, alpha, beta, false);
          maxEval = Math.max(maxEval, evaluation);
          alpha = Math.max(alpha, evaluation);
          
          if (beta <= alpha) break;
        }
        if (beta <= alpha) break;
      }
      
      return maxEval;
    } else {
      let minEval = Infinity;
      
      for (const { index } of activePieces) {
        const moves = getValidMoves(board, index, piecesWithCaptures.length > 0);
        
        for (const move of moves) {
          const newBoard = [...board];
          newBoard[move] = newBoard[index];
          newBoard[index] = null;
          
          const [fromRow, fromCol] = getPosition(index);
          const [toRow, toCol] = getPosition(move);
          if (Math.abs(toRow - fromRow) === 2) {
            newBoard[getIndex((fromRow + toRow) / 2, (fromCol + toCol) / 2)] = null;
          }
          
          if (newBoard[move] === 'BP' && toRow === 0) newBoard[move] = 'BK';
          
          const evaluation = minimax(newBoard, depth - 1, alpha, beta, true);
          minEval = Math.min(minEval, evaluation);
          beta = Math.min(beta, evaluation);
          
          if (beta <= alpha) break;
        }
        if (beta <= alpha) break;
      }
      
      return minEval;
    }
  }, [evaluateBoard, getValidMoves, getCaptureMoves]);

  const handleSquareClick = (index: number) => {
    if (gameStatus !== 'playing' || !isPlayerTurn || isThinking) return;

    const piece = board[index];

    if (piece && piece[0] === 'B' && selectedPiece === null) {
      // Check if forced capture exists
      if (mustCaptureFrom.length > 0 && !mustCaptureFrom.includes(index)) {
        return; // Can only select pieces that can capture
      }
      
      setSelectedPiece(index);
      const moves = getValidMoves(board, index, mustCaptureFrom.length > 0);
      setValidMoves(moves);
      return;
    }

    if (selectedPiece !== null && validMoves.includes(index)) {
      makeMove(selectedPiece, index);
      setSelectedPiece(null);
      setValidMoves([]);
    } else {
      setSelectedPiece(null);
      setValidMoves([]);
    }
  };

  const makeMove = (from: number, to: number) => {
    const newBoard = [...board];
    newBoard[to] = newBoard[from];
    newBoard[from] = null;

    const [fromRow, fromCol] = getPosition(from);
    const [toRow, toCol] = getPosition(to);
    
    const wasCapture = Math.abs(toRow - fromRow) === 2;
    if (wasCapture) {
      newBoard[getIndex((fromRow + toRow) / 2, (fromCol + toCol) / 2)] = null;
    }

    if (newBoard[to] === 'BP' && toRow === 0) newBoard[to] = 'BK';
    else if (newBoard[to] === 'WP' && toRow === 7) newBoard[to] = 'WK';

    // Check for multi-jump
    if (wasCapture) {
      const additionalCaptures = getCaptureMoves(newBoard, to);
      if (additionalCaptures.length > 0) {
        setBoard(newBoard);
        setSelectedPiece(to);
        setValidMoves(additionalCaptures);
        setMustCaptureFrom([to]);
        return;
      }
    }

    setBoard(newBoard);
    setMustCaptureFrom([]);

    const blackPieces = newBoard.filter(p => p && p[0] === 'B').length;
    const whitePieces = newBoard.filter(p => p && p[0] === 'W').length;

    if (whitePieces === 0) {
      setGameStatus('player-win');
      setPlayerScore(prev => prev + 1);
      return;
    }

    if (blackPieces === 0) {
      setGameStatus('ai-win');
      setAiScore(prev => prev + 1);
      return;
    }

    // Check for forced captures for AI
    const aiPiecesWithCaptures: number[] = [];
    for (let i = 0; i < 64; i++) {
      if (newBoard[i] && newBoard[i]![0] === 'W') {
        if (getCaptureMoves(newBoard, i).length > 0) {
          aiPiecesWithCaptures.push(i);
        }
      }
    }

    setIsPlayerTurn(false);
    setIsThinking(true);
    setTimeout(() => aiMove(newBoard), 800);
  };

  const aiMove = (currentBoard: Board) => {
    // Check for forced captures
    const aiPiecesWithCaptures: number[] = [];
    for (let i = 0; i < 64; i++) {
      if (currentBoard[i] && currentBoard[i]![0] === 'W') {
        if (getCaptureMoves(currentBoard, i).length > 0) {
          aiPiecesWithCaptures.push(i);
        }
      }
    }
    
    let bestMove: { from: number; to: number } | null = null;
    let bestScore = -Infinity;
    
    const aiPieces = aiPiecesWithCaptures.length > 0 
      ? aiPiecesWithCaptures.map(i => ({ piece: currentBoard[i], index: i }))
      : currentBoard.map((p, i) => ({ piece: p, index: i })).filter(({ piece }) => piece && piece[0] === 'W');
    
    for (const { index } of aiPieces) {
      const moves = getValidMoves(currentBoard, index, aiPiecesWithCaptures.length > 0);
      
      for (const move of moves) {
        const newBoard = [...currentBoard];
        newBoard[move] = newBoard[index];
        newBoard[index] = null;
        
        const [fromRow, fromCol] = getPosition(index);
        const [toRow, toCol] = getPosition(move);
        const isCapture = Math.abs(toRow - fromRow) === 2;
        
        if (isCapture) {
          newBoard[getIndex((fromRow + toRow) / 2, (fromCol + toCol) / 2)] = null;
        }
        
        if (newBoard[move] === 'WP' && toRow === 7) newBoard[move] = 'WK';
        
        const score = minimax(newBoard, 5, -Infinity, Infinity, false);
        const finalScore = isCapture ? score + 1000 : score;
        
        if (finalScore > bestScore) {
          bestScore = finalScore;
          bestMove = { from: index, to: move };
        }
      }
    }
    
    if (!bestMove) {
      setIsPlayerTurn(true);
      setIsThinking(false);
      return;
    }
    
    const newBoard = [...currentBoard];
    newBoard[bestMove.to] = newBoard[bestMove.from];
    newBoard[bestMove.from] = null;
    
    const [fromRow, fromCol] = getPosition(bestMove.from);
    const [toRow, toCol] = getPosition(bestMove.to);
    
    const wasCapture = Math.abs(toRow - fromRow) === 2;
    if (wasCapture) {
      newBoard[getIndex((fromRow + toRow) / 2, (fromCol + toCol) / 2)] = null;
    }
    
    if (newBoard[bestMove.to] === 'WP' && toRow === 7) newBoard[bestMove.to] = 'WK';
    
    // Check for multi-jump
    if (wasCapture) {
      const additionalCaptures = getCaptureMoves(newBoard, bestMove.to);
      if (additionalCaptures.length > 0) {
        setBoard(newBoard);
        setTimeout(() => aiMove(newBoard), 600);
        return;
      }
    }
    
    setBoard(newBoard);
    
    const blackPieces = newBoard.filter(p => p && p[0] === 'B').length;
    const whitePieces = newBoard.filter(p => p && p[0] === 'W').length;
    
    if (blackPieces === 0) {
      setGameStatus('ai-win');
      setAiScore(prev => prev + 1);
    } else if (whitePieces === 0) {
      setGameStatus('player-win');
      setPlayerScore(prev => prev + 1);
    }
    
    // Check for forced captures for player
    const playerPiecesWithCaptures: number[] = [];
    for (let i = 0; i < 64; i++) {
      if (newBoard[i] && newBoard[i]![0] === 'B') {
        if (getCaptureMoves(newBoard, i).length > 0) {
          playerPiecesWithCaptures.push(i);
        }
      }
    }
    setMustCaptureFrom(playerPiecesWithCaptures);
    
    setIsPlayerTurn(true);
    setIsThinking(false);
  };

  const resetGame = () => {
    setBoard(initializeBoard());
    setIsPlayerTurn(true);
    setGameStatus('playing');
    setSelectedPiece(null);
    setValidMoves([]);
    setIsThinking(false);
    setMustCaptureFrom([]);
  };

  const resetStats = () => {
    setPlayerScore(0);
    setAiScore(0);
    resetGame();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-black">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-2">
            หมากฮอสไทย vs Barron AI
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">กินหมากฝ่ายตรงข้ามให้หมดเพื่อชนะ • Invincible 2 Style</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors duration-200 cursor-pointer"
            >
              <span>Tic-Tac-Toe Mode</span>
            </Link>
            <a 
              href="https://barronai.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors duration-200 cursor-pointer"
            >
              <span>Visit Barron AI</span>
            </a>
          </div>
        </div>

        <div className="max-w-4xl mx-auto grid lg:grid-cols-2 gap-6">
          <div>
            <div className="bg-amber-900 dark:bg-amber-950 rounded-xl p-4 border-4 border-amber-800 shadow-2xl">
              <div 
                className="grid gap-0 mx-auto"
                style={{ 
                  gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
                  maxWidth: '400px',
                  background: 'linear-gradient(135deg, #d4a574 0%, #c9984a 100%)'
                }}
              >
                {board.map((piece, index) => {
                  const [row, col] = getPosition(index);
                  const isPlayable = isValidSquare(row, col);
                  const isSelected = selectedPiece === index;
                  const isValidMove = validMoves.includes(index);
                  const mustCapture = mustCaptureFrom.includes(index);

                  return (
                    <div
                      key={index}
                      onClick={() => handleSquareClick(index)}
                      className={`
                        aspect-square flex items-center justify-center transition-all duration-200 cursor-pointer
                        ${isPlayable ? 'bg-amber-700/40' : 'bg-amber-900/80'}
                        ${isSelected ? 'ring-4 ring-blue-400 ring-inset' : ''}
                        ${isValidMove ? 'ring-4 ring-green-400 ring-inset' : ''}
                        ${mustCapture ? 'ring-4 ring-yellow-400 ring-inset animate-pulse' : ''}
                      `}
                    >
                      {piece && (
                        <div className={`
                          w-3/4 h-3/4 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg
                          ${piece[0] === 'B' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}
                        `}>
                          {piece[1] === 'K' ? '♔' : '●'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={resetGame}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all cursor-pointer"
              >
                New Game
              </button>
              <button
                onClick={resetStats}
                className="px-6 py-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-all cursor-pointer"
              >
                Reset Stats
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">You (ดำ)</div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">{playerScore}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">AI (ขาว)</div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">{aiScore}</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
              <div className="text-center">
                {gameStatus === 'playing' && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase">
                      {isPlayerTurn && !isThinking ? 'Your Turn' : 'AI Turn'}
                    </p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {isPlayerTurn && !isThinking ? 'เลือกหมากของคุณ' : 'AI กำลังคิด...'}
                    </p>
                  </div>
                )}
                {gameStatus === 'player-win' && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400 uppercase">Victory</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">คุณชนะ!</p>
                  </div>
                )}
                {gameStatus === 'ai-win' && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400 uppercase">Defeat</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">AI ชนะ</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>วิธีเล่น:</strong><br/>
                • คลิกเลือกหมากของคุณ (ดำ)<br/>
                • คลิกช่องสีเขียวเพื่อเดิน<br/>
                • กินหมากฝ่ายตรงข้ามให้หมดเพื่อชนะ<br/>
                • เบี้ยถึงแถวสุดท้ายจะกลายเป็นฮอส (♔)<br/>
                • <strong>บังคับกิน:</strong> ถ้ากินได้ต้องกิน (ช่องสีเหลืองกระพริบ)<br/>
                • สามารถกินต่อเนื่องหลายตัวได้<br/>
                • AI ใช้ Minimax depth 5 + Alpha-Beta Pruning
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
