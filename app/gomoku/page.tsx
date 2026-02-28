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
  const [lastStarter, setLastStarter] = useState<'player' | 'ai'>('ai');

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
        setLastStarter(stats.lastStarter || 'ai');
      } catch (error) {
        console.error('Failed to load stats');
      }
    }
    
    // Determine who starts based on lastStarter
    const nextStarter = lastStarter === 'player' ? 'ai' : 'player';
    if (nextStarter === 'ai') {
      console.log('🤖 AI starts first this game');
      setIsPlayerTurn(false);
      setIsThinking(true);
      setTimeout(() => aiMove(initializeBoard()), 1000);
    } else {
      console.log('👤 Player starts first this game');
    }
  }, []);

  // Save stats to localStorage
  useEffect(() => {
    localStorage.setItem('makhos-stats', JSON.stringify({
      playerScore,
      aiScore,
      lastStarter
    }));
  }, [playerScore, aiScore, lastStarter]);

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
      
      // Check if player has no moves (lose condition)
      if (playerPiecesWithCaptures.length === 0) {
        let hasAnyMoves = false;
        for (let i = 0; i < 64; i++) {
          if (board[i] && board[i]![0] === 'B') {
            const moves = [];
            const [row, col] = getPosition(i);
            const isKing = board[i]![1] === 'K';
            const directions = isKing ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : [[-1, -1], [-1, 1]];
            
            for (const [dr, dc] of directions) {
              const newRow = row + dr;
              const newCol = col + dc;
              const newIndex = getIndex(newRow, newCol);
              if (newIndex !== -1 && isValidSquare(newRow, newCol) && !board[newIndex]) {
                hasAnyMoves = true;
                break;
              }
            }
            if (hasAnyMoves) break;
          }
        }
        
        if (!hasAnyMoves) {
          console.log('😢 Player has no valid moves - AI WINS!');
          setGameStatus('ai-win');
          setAiScore(prev => prev + 1);
          // Don't update lastStarter here - it will be updated in resetGame
        }
      }
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

  const evaluateBoard = useCallback((board: Board, logDetails: boolean = false): number => {
    let score = 0;
    let whitePieces = 0;
    let blackPieces = 0;
    let whiteKings = 0;
    let blackKings = 0;
    let whitePositionScore = 0;
    let blackPositionScore = 0;
    let whiteThreatened = 0;
    let blackThreatened = 0;
    let whiteCanCapture = 0;
    let blackCanCapture = 0;
    let whiteVulnerable = 0; // NEW: pieces that would be vulnerable after moving
    let blackVulnerable = 0;
    
    // Check for threatened pieces and capture opportunities
    const threatenedPieces = new Set<number>();
    for (let i = 0; i < 64; i++) {
      const piece = board[i];
      if (!piece) continue;
      
      const [row, col] = getPosition(i);
      const isWhite = piece[0] === 'W';
      
      // Check capture opportunities
      const captures = getCaptureMoves(board, i);
      if (captures.length > 0) {
        if (isWhite) whiteCanCapture += captures.length;
        else blackCanCapture += captures.length;
      }
      
      // Check if this piece can be captured
      const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of directions) {
        const attackerRow = row - dr;
        const attackerCol = col - dc;
        const attackerIndex = getIndex(attackerRow, attackerCol);
        
        if (attackerIndex !== -1) {
          const attacker = board[attackerIndex];
          if (attacker && attacker[0] !== piece[0]) {
            const landingRow = row + dr;
            const landingCol = col + dc;
            const landingIndex = getIndex(landingRow, landingCol);
            
            if (landingIndex !== -1 && isValidSquare(landingRow, landingCol) && !board[landingIndex]) {
              threatenedPieces.add(i);
              if (isWhite) whiteThreatened++;
              else blackThreatened++;
            }
          }
        }
      }
      
      // NEW: Check if moving this piece would create vulnerability
      const moves = getValidMoves(board, i, false);
      for (const moveIndex of moves) {
        const [moveRow, moveCol] = getPosition(moveIndex);
        // Check if the destination would be vulnerable
        for (const [dr, dc] of directions) {
          const attackerRow = moveRow - dr;
          const attackerCol = moveCol - dc;
          const attackerIndex = getIndex(attackerRow, attackerCol);
          
          if (attackerIndex !== -1 && attackerIndex !== i) {
            const attacker = board[attackerIndex];
            if (attacker && attacker[0] !== piece[0]) {
              const landingRow = moveRow + dr;
              const landingCol = moveCol + dc;
              const landingIndex = getIndex(landingRow, landingCol);
              
              if (landingIndex !== -1 && isValidSquare(landingRow, landingCol) && !board[landingIndex]) {
                if (isWhite) whiteVulnerable++;
                else blackVulnerable++;
                break;
              }
            }
          }
        }
      }
    }
    
    for (let i = 0; i < 64; i++) {
      const piece = board[i];
      if (!piece) continue;
      
      const [row, col] = getPosition(i);
      const isWhite = piece[0] === 'W';
      const isKing = piece[1] === 'K';
      
      if (isWhite) {
        whitePieces++;
        if (isKing) whiteKings++;
      } else {
        blackPieces++;
        if (isKing) blackKings++;
      }
      
      // Base value - MUCH higher for kings
      let value = isKing ? 500 : 100;
      
      // Center control bonus (stronger for AI)
      const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
      value += (14 - centerDistance) * (isWhite ? 12 : 8);
      
      // Advancement bonus for pawns (MUCH stronger for AI)
      if (!isKing) {
        if (isWhite && row >= 4) value += (row - 3) * 50;
        if (!isWhite && row <= 3) value += (4 - row) * 30;
      }
      
      // Edge penalty (stronger)
      if (col === 0 || col === 7) value -= 25;
      if (row === 0 || row === 7) value -= 15;
      
      // Back row protection bonus (stronger for AI)
      if (!isKing) {
        if (isWhite && row <= 1) value += 25;
        if (!isWhite && row >= 6) value += 15;
      }
      
      // Mobility bonus (stronger for AI)
      const moves = getValidMoves(board, i, false);
      value += moves.length * (isWhite ? 12 : 8);
      
      // Threatened piece penalty (MUCH stronger)
      if (threatenedPieces.has(i)) {
        value -= isKing ? 200 : 80;
      }
      
      // Protected piece bonus (stronger for AI)
      let isProtected = false;
      for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        const protectorIndex = getIndex(row + dr, col + dc);
        if (protectorIndex !== -1) {
          const protector = board[protectorIndex];
          if (protector && protector[0] === piece[0]) {
            isProtected = true;
            break;
          }
        }
      }
      if (isProtected) value += (isWhite ? 20 : 10);
      
      // King positioning bonus
      if (isKing && isWhite) {
        // Kings should be aggressive and central
        value += 50;
      }
      
      if (isWhite) {
        whitePositionScore += value;
      } else {
        blackPositionScore += value;
      }
      
      score += isWhite ? value : -value;
    }
    
    // Material advantage (MUCH stronger weight)
    const materialDiff = (whitePieces - blackPieces) * 250;
    const kingDiff = (whiteKings - blackKings) * 400;
    
    // Threat penalty (stronger)
    const threatDiff = (blackThreatened - whiteThreatened) * 50;
    
    // Capture opportunity bonus (NEW - heavily favor having captures available)
    const captureDiff = (whiteCanCapture - blackCanCapture) * 100;
    
    // Vulnerability penalty (NEW - avoid creating capture opportunities for opponent)
    const vulnerabilityDiff = (blackVulnerable - whiteVulnerable) * 40;
    
    score += materialDiff + kingDiff + threatDiff + captureDiff + vulnerabilityDiff;
    
    // Endgame bonus: push for king promotion (stronger for AI)
    if (whitePieces + blackPieces <= 8) {
      for (let i = 0; i < 64; i++) {
        const piece = board[i];
        if (!piece || piece[1] === 'K') continue;
        
        const [row] = getPosition(i);
        if (piece[0] === 'W' && row >= 4) {
          score += (row - 3) * 40;
        } else if (piece[0] === 'B' && row <= 3) {
          score -= (4 - row) * 20;
        }
      }
    }
    
    // Winning/losing position detection
    if (whitePieces === 0) score = -50000;
    if (blackPieces === 0) score = 50000;
    
    if (logDetails) {
      console.log('📊 Board Evaluation:', {
        totalScore: score,
        white: { pieces: whitePieces, kings: whiteKings, positionScore: whitePositionScore, threatened: whiteThreatened, canCapture: whiteCanCapture, vulnerable: whiteVulnerable },
        black: { pieces: blackPieces, kings: blackKings, positionScore: blackPositionScore, threatened: blackThreatened, canCapture: blackCanCapture, vulnerable: blackVulnerable },
        materialDiff,
        kingDiff,
        threatDiff,
        captureDiff,
        vulnerabilityDiff
      });
    }
    
    return score;
  }, [getValidMoves, getCaptureMoves]);

  const minimax = useCallback((board: Board, depth: number, alpha: number, beta: number, isMaximizing: boolean): number => {
    if (depth === 0) return evaluateBoard(board, false);
    
    const pieces = board.map((p, i) => ({ piece: p, index: i }))
      .filter(({ piece }) => piece && (isMaximizing ? piece[0] === 'W' : piece[0] === 'B'));
    
    if (pieces.length === 0) return isMaximizing ? -100000 : 100000;
    
    // Check for forced captures
    const piecesWithCaptures = pieces.filter(({ index }) => getCaptureMoves(board, index).length > 0);
    const activePieces = piecesWithCaptures.length > 0 ? piecesWithCaptures : pieces;
    
    // Move ordering for better pruning
    const orderedPieces = activePieces.sort((a, b) => {
      const aIsKing = a.piece![1] === 'K';
      const bIsKing = b.piece![1] === 'K';
      if (aIsKing !== bIsKing) return bIsKing ? 1 : -1;
      return 0;
    });
    
    if (isMaximizing) {
      let maxEval = -Infinity;
      
      for (const { index } of orderedPieces) {
        const moves = getValidMoves(board, index, piecesWithCaptures.length > 0);
        
        // Order moves: captures first, then by advancement
        const orderedMoves = moves.sort((a, b) => {
          const [fromRow] = getPosition(index);
          const [aRow] = getPosition(a);
          const [bRow] = getPosition(b);
          const aIsCapture = Math.abs(aRow - fromRow) === 2;
          const bIsCapture = Math.abs(bRow - fromRow) === 2;
          if (aIsCapture !== bIsCapture) return bIsCapture ? 1 : -1;
          return bRow - aRow; // Prefer advancing
        });
        
        for (const move of orderedMoves) {
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
      
      for (const { index } of orderedPieces) {
        const moves = getValidMoves(board, index, piecesWithCaptures.length > 0);
        
        // Order moves: captures first, then by advancement
        const orderedMoves = moves.sort((a, b) => {
          const [fromRow] = getPosition(index);
          const [aRow] = getPosition(a);
          const [bRow] = getPosition(b);
          const aIsCapture = Math.abs(aRow - fromRow) === 2;
          const bIsCapture = Math.abs(bRow - fromRow) === 2;
          if (aIsCapture !== bIsCapture) return bIsCapture ? 1 : -1;
          return aRow - bRow; // Prefer advancing
        });
        
        for (const move of orderedMoves) {
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
    const [fromRow, fromCol] = getPosition(from);
    const [toRow, toCol] = getPosition(to);
    
    console.log(`\n👤 ========== PLAYER MOVE ==========`);
    console.log(`📍 From: [${fromRow},${fromCol}] → To: [${toRow},${toCol}]`);
    
    const newBoard = [...board];
    newBoard[to] = newBoard[from];
    newBoard[from] = null;
    
    const wasCapture = Math.abs(toRow - fromRow) === 2;
    if (wasCapture) {
      const capturedIndex = getIndex((fromRow + toRow) / 2, (fromCol + toCol) / 2);
      const capturedPiece = newBoard[capturedIndex];
      console.log(`🎯 CAPTURED: ${capturedPiece} at [${Math.floor(capturedIndex / 8)},${capturedIndex % 8}]`);
      newBoard[capturedIndex] = null;
    }

    if (newBoard[to] === 'BP' && toRow === 0) {
      newBoard[to] = 'BK';
      console.log('👑 PROMOTION to King!');
    } else if (newBoard[to] === 'WP' && toRow === 7) {
      newBoard[to] = 'WK';
      console.log('👑 PROMOTION to King!');
    }

    // Check for multi-jump
    if (wasCapture) {
      const additionalCaptures = getCaptureMoves(newBoard, to);
      if (additionalCaptures.length > 0) {
        console.log(`🔄 Multi-jump available! ${additionalCaptures.length} more captures possible`);
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

    console.log(`📊 After player move: White=${whitePieces} pieces, Black=${blackPieces} pieces`);

    if (whitePieces === 0) {
      console.log('🎉 PLAYER WINS!');
      setGameStatus('player-win');
      setPlayerScore(prev => prev + 1);
      // Don't update lastStarter here - it will be updated in resetGame
      return;
    }

    if (blackPieces === 0) {
      console.log('😢 PLAYER LOSES!');
      setGameStatus('ai-win');
      setAiScore(prev => prev + 1);
      // Don't update lastStarter here - it will be updated in resetGame
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

    console.log('👤 ========== PLAYER MOVE END ==========\n');
    
    setIsPlayerTurn(false);
    setIsThinking(true);
    setTimeout(() => aiMove(newBoard), 800);
  };

  const aiMove = (currentBoard: Board) => {
    console.log('🤖 ========== AI TURN START ==========');
    console.log('📋 Current Board State:');
    evaluateBoard(currentBoard, true);
    
    // Check for forced captures
    const aiPiecesWithCaptures: number[] = [];
    for (let i = 0; i < 64; i++) {
      if (currentBoard[i] && currentBoard[i]![0] === 'W') {
        if (getCaptureMoves(currentBoard, i).length > 0) {
          aiPiecesWithCaptures.push(i);
        }
      }
    }
    
    if (aiPiecesWithCaptures.length > 0) {
      console.log('⚠️ FORCED CAPTURES available from positions:', aiPiecesWithCaptures.map(i => {
        const [r, c] = getPosition(i);
        return `[${r},${c}]`;
      }));
    }
    
    let bestMove: { from: number; to: number } | null = null;
    let bestScore = -Infinity;
    let wasCaptureBest = false;
    let wasBestPromotion = false;
    const moveEvaluations: any[] = [];
    
    const aiPieces = aiPiecesWithCaptures.length > 0 
      ? aiPiecesWithCaptures.map(i => ({ piece: currentBoard[i], index: i }))
      : currentBoard.map((p, i) => ({ piece: p, index: i })).filter(({ piece }) => piece && piece[0] === 'W');
    
    console.log(`🔍 Analyzing ${aiPieces.length} AI pieces...`);
    
    for (const { index } of aiPieces) {
      const moves = getValidMoves(currentBoard, index, aiPiecesWithCaptures.length > 0);
      const [fromRow, fromCol] = getPosition(index);
      
      console.log(`\n📍 Piece at [${fromRow},${fromCol}] (${currentBoard[index]}) - ${moves.length} possible moves`);
      
      for (const move of moves) {
        const newBoard = [...currentBoard];
        newBoard[move] = newBoard[index];
        newBoard[index] = null;
        
        const [toRow, toCol] = getPosition(move);
        const isCapture = Math.abs(toRow - fromRow) === 2;
        
        let capturedPiece = null;
        if (isCapture) {
          const midIndex = getIndex((fromRow + toRow) / 2, (fromCol + toCol) / 2);
          capturedPiece = newBoard[midIndex];
          newBoard[midIndex] = null;
        }
        
        if (newBoard[move] === 'WP' && toRow === 7) newBoard[move] = 'WK';
        
        // Dynamic depth based on game state
        const totalPieces = newBoard.filter(p => p !== null).length;
        let searchDepth = 8; // Base depth increased from 7 to 8
        
        // Increase depth in endgame
        if (totalPieces <= 8) searchDepth = 10;
        else if (totalPieces <= 12) searchDepth = 9;
        
        // Increase depth for capture sequences
        if (isCapture) searchDepth += 1;
        
        const score = minimax(newBoard, searchDepth, -Infinity, Infinity, false);
        const finalScore = isCapture ? score + 1500 : score; // Increased capture bonus from 1000 to 1500
        
        const moveInfo = {
          from: `[${fromRow},${fromCol}]`,
          to: `[${toRow},${toCol}]`,
          isCapture,
          capturedPiece,
          rawScore: score,
          finalScore,
          promotion: newBoard[move] === 'WK' && currentBoard[index] === 'WP'
        };
        
        moveEvaluations.push(moveInfo);
        
        console.log(`  → Move to [${toRow},${toCol}]: ${isCapture ? '🎯 CAPTURE' : '📦 Normal'} | Score: ${finalScore} ${moveInfo.promotion ? '👑 PROMOTION' : ''}`);
        
        // Better move selection: prefer moves with higher scores, but also consider:
        // 1. Captures are heavily favored
        // 2. King promotions are favored
        // 3. In case of tie, prefer more aggressive moves (advancement)
        if (finalScore > bestScore || 
            (finalScore === bestScore && isCapture && !wasCaptureBest) ||
            (finalScore === bestScore && moveInfo.promotion && !wasBestPromotion)) {
          bestScore = finalScore;
          bestMove = { from: index, to: move };
          wasCaptureBest = isCapture;
          wasBestPromotion = moveInfo.promotion;
        }
      }
    }
    
    console.log('\n🏆 BEST MOVE SELECTED:');
    if (bestMove) {
      const [fromRow, fromCol] = getPosition(bestMove.from);
      const [toRow, toCol] = getPosition(bestMove.to);
      const isCapture = Math.abs(toRow - fromRow) === 2;
      console.log(`  From: [${fromRow},${fromCol}] → To: [${toRow},${toCol}]`);
      console.log(`  Type: ${isCapture ? '🎯 CAPTURE' : '📦 Normal Move'}`);
      console.log(`  Score: ${bestScore}`);
    }
    
    if (!bestMove) {
      console.log('❌ No valid moves available - AI cannot move');
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
        console.log('🔄 Multi-jump available! Continuing capture sequence...');
        setBoard(newBoard);
        setTimeout(() => aiMove(newBoard), 600);
        return;
      }
    }
    
    setBoard(newBoard);
    
    const blackPieces = newBoard.filter(p => p && p[0] === 'B').length;
    const whitePieces = newBoard.filter(p => p && p[0] === 'W').length;
    
    console.log(`\n📊 After AI move: White=${whitePieces} pieces, Black=${blackPieces} pieces`);
    
    if (blackPieces === 0) {
      console.log('🎉 AI WINS!');
      setGameStatus('ai-win');
      setAiScore(prev => prev + 1);
      // Don't update lastStarter here - it will be updated in resetGame
    } else if (whitePieces === 0) {
      console.log('😢 AI LOSES!');
      setGameStatus('player-win');
      setPlayerScore(prev => prev + 1);
      // Don't update lastStarter here - it will be updated in resetGame
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
    
    if (playerPiecesWithCaptures.length > 0) {
      console.log('⚠️ Player has FORCED CAPTURES at:', playerPiecesWithCaptures.map(i => {
        const [r, c] = getPosition(i);
        return `[${r},${c}]`;
      }));
    }
    
    setMustCaptureFrom(playerPiecesWithCaptures);
    
    // Check if player has no moves at all (lose condition)
    if (playerPiecesWithCaptures.length === 0) {
      let hasAnyMoves = false;
      for (let i = 0; i < 64; i++) {
        if (newBoard[i] && newBoard[i]![0] === 'B') {
          if (getValidMoves(newBoard, i, false).length > 0) {
            hasAnyMoves = true;
            break;
          }
        }
      }
      
      if (!hasAnyMoves) {
        console.log('😢 Player has no valid moves - AI WINS!');
        setGameStatus('ai-win');
        setAiScore(prev => prev + 1);
        // Don't update lastStarter here - it will be updated in resetGame
        setIsPlayerTurn(true);
        setIsThinking(false);
        console.log('🤖 ========== AI TURN END ==========\n');
        return;
      }
    }
    
    console.log('🤖 ========== AI TURN END ==========\n');
    setIsPlayerTurn(true);
    setIsThinking(false);
  };

  const resetGame = () => {
    const newBoard = initializeBoard();
    setBoard(newBoard);
    setGameStatus('playing');
    setSelectedPiece(null);
    setValidMoves([]);
    setIsThinking(false);
    setMustCaptureFrom([]);
    
    // Alternate starter based on current lastStarter
    const nextStarter = lastStarter === 'player' ? 'ai' : 'player';
    setLastStarter(nextStarter);
    
    if (nextStarter === 'ai') {
      console.log('🤖 AI starts first this game');
      setIsPlayerTurn(false);
      setIsThinking(true);
      setTimeout(() => aiMove(newBoard), 1000);
    } else {
      console.log('👤 Player starts first this game');
      setIsPlayerTurn(true);
    }
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
                  <div className="space-y-4">
                    {isPlayerTurn && !isThinking ? (
                      <>
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-400">
                          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Your Turn</p>
                          <p className="text-base font-semibold text-slate-900 dark:text-white">Make your move</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-700/50 border-2 border-slate-300 dark:border-slate-600">
                          <svg className="w-6 h-6 text-slate-600 dark:text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">AI Turn</p>
                          <p className="text-base font-semibold text-slate-900 dark:text-white">Calculating...</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {gameStatus === 'player-win' && (
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-400">
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Victory</p>
                      <p className="text-base font-semibold text-slate-900 dark:text-white">You won!</p>
                    </div>
                  </div>
                )}
                {gameStatus === 'ai-win' && (
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-400">
                      <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Defeat</p>
                      <p className="text-base font-semibold text-slate-900 dark:text-white">AI won</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>วิธีเล่น</strong><br/>
                • คลิกเลือกหมากของคุณ (ดำ)<br/>
                • คลิกช่องสีเขียวเพื่อเดิน<br/>
                • กินหมากฝ่ายตรงข้ามให้หมดเพื่อชนะ<br/>
                • เบี้ยถึงแถวสุดท้ายจะกลายเป็นฮอส (♔)<br/>
                • สามารถกินต่อเนื่องหลายตัวได้
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
