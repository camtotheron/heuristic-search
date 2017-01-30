import { Grid } from './grid.model';
import { Cell } from './cell.model';
import { Direction } from './cell.model';
import { CellType} from './cell.model';

class Rng {

    static getRandomBool() {
        var a = new Uint8Array(1);
        crypto.getRandomValues(a);
            return a[0] < 127;
    }

    static shuffleArray(array: Array<any>) {
        for (let i=0; i<array.length; i++) {
            let j = this.generateRandomIntInclusive(0, i);
            let temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }

    static generateRandomIntInclusive(min: number, max: number) {
        return Math.floor(Math.random() * ((max + 1) - min)) + min;
    }
}

export class GridInitializer {

    private readonly hardRegionDimensions: [number, number] = [31, 31];
    private readonly hardRegionCount = 8;
    private readonly minPathLength = 100;
    private readonly pathTurnProb = 0.6;
    private readonly pathLegLength = 20;
    private readonly maxPathCount = 4;
    private readonly blockedProb = 0.2;

    public readonly hardRegionCenters: Array<[number, number]>;

    constructor(grid: Grid) {

        this.hardRegionCenters = this.populateHardRegions(grid, this.hardRegionCount, this.hardRegionDimensions);
        this.populateFastPaths(grid, this.maxPathCount, this.minPathLength, this.pathLegLength, this.pathTurnProb);
        this.populateBlockedCells(grid, this.blockedProb);
    }

    private populateHardRegions(grid: Grid, regionCount: number, regionDimensions: [number, number]) {
        let midPoints = new Array<[number, number]>();

        for (let i=0; i<regionCount; i++) {
            let regionStartRow = Rng.generateRandomIntInclusive(0, grid.length - regionDimensions[0] - 1);
            let regionStartCol = Rng.generateRandomIntInclusive(0, grid.width - regionDimensions[1] - 1);

            let rowMid = regionStartRow + Math.floor(regionDimensions[0] / 2);
            let colMid = regionStartCol + Math.floor(regionDimensions[1] / 2);

            midPoints.push([rowMid, colMid]);

            for (let row = 0; row < regionDimensions[0]; row++) {
                for (let col = 0; col < regionDimensions[1]; col++) {
                    if (Rng.getRandomBool()) {
                        grid.getCell(row + regionStartRow, col + regionStartCol).cellType = CellType.PartiallyBlocked;
                    }
                }
            }
        }
        return midPoints;
    }

    private populateFastPaths(grid: Grid, pathLimit: number, minPathLength: number, legLength: number, turnProb: number) {
        let paths = Array<Array<Cell>>();
        let pathCount = 0;
        let tryLimit = ((2 * grid.length) + (2 * grid.width)) - 4;
        let spinCount = 0;
        while (pathCount < pathLimit) {

            let path = new Array<Cell>();
            let tries = 0;

            let shouldClear = false;
            let startCell = this.getRandomEdgeCell(grid);
            let direction = this.getRandomCardinalDirection(startCell);
            let currentCell = startCell;

            while(path.length < minPathLength) {
                let count = 0;
                while (currentCell !== null && count < legLength) {
                    if (currentCell.isFast) {
                        shouldClear = true;
                        break;
                    }

                    currentCell.isFast = true;
                    path.push(currentCell);
                    currentCell = currentCell.getNeigbor(direction);
                    count++;
                }

                if (count !== legLength) {
                    shouldClear = true;
                }

                if (shouldClear) {
                    tries++;
                    path.forEach(cell => {
                        cell.isFast = false;
                    });
                    path = new Array<Cell>();
                    break;
                }

                if (tries >= tryLimit) {
                    paths.forEach(p => {
                        p.forEach(cell => {   
                            cell.isFast = false;
                        });  
                    });
                    paths = new Array<Array<Cell>>();
                    pathCount = 0;
                    shouldClear = true;
                    break;
                }

                if (Math.random() > turnProb) {
                    let shouldMovePositive = Rng.getRandomBool();
                    if (direction === Direction.Up || direction === Direction.Down) {
                        if (shouldMovePositive) {
                            direction = Direction.Right
                        } else {
                            direction = Direction.Left;
                        }
                    } else {
                        if (shouldMovePositive) {
                            direction = Direction.Down
                        } else {
                            direction = Direction.Up;
                        }
                    }
                }
            }

            if (!shouldClear) {
                paths.push(path);
                tries = 0;
                pathCount++;
            }
        }
    }

    private getRandomCardinalDirection(cell: Cell) {
        let directions = cell.availableCardinalDirections;
        Rng.shuffleArray(directions);

        return directions[0];
    }

    private getRandomEdgeCell(grid: Grid) {
        // The idea here is that we unroll the edges into a flat array and then randomlly pick one.
        let edgeCoordinates = new Array<[number, number]>();

        for (let col=0; col<grid.width; col++) {
            edgeCoordinates.push([0, col]);
            edgeCoordinates.push([grid.length - 1, col]);
        }

        for (let row=1; row<grid.length - 1; row++) {
            edgeCoordinates.push([row, 0]);
            edgeCoordinates.push([row, grid.width - 1]);
        }
        
        Rng.shuffleArray(edgeCoordinates);

        let randomCoordinate = edgeCoordinates[0];
        
        return grid.getCell(randomCoordinate[0], randomCoordinate[1]);
    }

    private populateBlockedCells(grid: Grid, blockedProb: number) {      
        for (let row=0; row<grid.length; row++) {
            for (let col=0; col<grid.width; col++) {
                let cell = grid.getCell(row, col);
                
                if (cell.isFast) {
                    continue;
                }
                
                if (Math.random() <= blockedProb) {
                    cell.cellType = CellType.Blocked;
                }
            }
        }
    }
}