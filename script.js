/**
 * ============================================================================
 * Operating Systems Project: File System Simulator
 * Contiguous, Linked, and Indexed File Allocation Methods
 * ============================================================================
 * 
 * CORE OS CONCEPTS COVERED:
 * 1. Disk Structure: 64 Virtual Blocks (8 characters / bytes per block).
 * 2. Directory Structure: Hierarchical tree with parent-child pointers.
 * 3. Contiguous Allocation: First-fit contiguous runs; susceptible to External Fragmentation.
 * 4. Linked Allocation: Non-contiguous blocks linked via block-level pointers; avoids external fragmentation.
 * 5. Indexed Allocation: Dedicated Index Block pointing to discrete data blocks; direct access without fragmentation.
 * 6. File Allocation Table (FAT): OS metadata table tracking file locations & sizes.
 * ============================================================================
 */

// Global Constants
const TOTAL_BLOCKS = 64;
const BLOCK_SIZE = 8; // 8 characters per block

// Curated distinct color palette for visually differentiating files on disk
const FILE_PALETTE = [
  '#2563eb', // Vibrant Blue
  '#16a34a', // Emerald Green
  '#d97706', // Amber / Orange
  '#9333ea', // Vivid Purple
  '#db2777', // Rose Pink
  '#0891b2', // Cyan
  '#ea580c', // Dark Orange
  '#4f46e5', // Indigo
  '#059669', // Teal
  '#ca8a04', // Golden
  '#e11d48', // Crimson
  '#7c3aed'  // Violet
];

/**
 * Disk Block Class
 * Represents an individual 8-byte allocation unit on the virtual drive
 */
class DiskBlock {
  constructor(index) {
    this.index = index;
    this.reset();
  }

  reset() {
    this.isFree = true;
    this.fileId = null;
    this.fileName = null;
    this.data = ""; // Up to 8 chars
    this.nextBlock = -1; // -1 denotes EOF (End-Of-File) for Linked Allocation
    this.isIndexBlock = false; // True if this block stores an index table (Indexed Allocation)
    this.indexPointers = []; // Stores array of data block indices when isIndexBlock is true
    this.color = null;
  }
}

/**
 * Virtual Disk Controller
 */
class VirtualDisk {
  constructor(totalBlocks = TOTAL_BLOCKS) {
    this.totalBlocks = totalBlocks;
    this.blocks = Array.from({ length: totalBlocks }, (_, i) => new DiskBlock(i));
  }

  format() {
    this.blocks.forEach(b => b.reset());
  }

  getFreeBlockCount() {
    return this.blocks.filter(b => b.isFree).length;
  }

  getUsedBlockCount() {
    return this.totalBlocks - this.getFreeBlockCount();
  }

  /**
   * Calculates the largest continuous run of free blocks on the disk.
   * Useful for detecting external fragmentation.
   */
  getMaxContiguousRun() {
    let maxRun = 0;
    let currentRun = 0;
    for (let i = 0; i < this.totalBlocks; i++) {
      if (this.blocks[i].isFree) {
        currentRun++;
        if (currentRun > maxRun) maxRun = currentRun;
      } else {
        currentRun = 0;
      }
    }
    return maxRun;
  }

  /**
   * Find the first-fit contiguous run of free blocks
   * Returns starting block index or -1 if no such run exists
   */
  findContiguousRun(neededBlocks) {
    let runStart = -1;
    let count = 0;

    for (let i = 0; i < this.totalBlocks; i++) {
      if (this.blocks[i].isFree) {
        if (count === 0) runStart = i;
        count++;
        if (count === neededBlocks) {
          return runStart;
        }
      } else {
        count = 0;
        runStart = -1;
      }
    }
    return -1;
  }

  /**
   * Returns an array of any N free block indices
   */
  getFreeBlockIndices(neededCount) {
    const freeIndices = [];
    for (let i = 0; i < this.totalBlocks; i++) {
      if (this.blocks[i].isFree) {
        freeIndices.push(i);
        if (freeIndices.length === neededCount) break;
      }
    }
    return freeIndices;
  }

  /**
   * Free all blocks associated with a specific file
   */
  freeFileBlocks(fileId) {
    this.blocks.forEach(block => {
      if (block.fileId === fileId) {
        block.reset();
      }
    });
  }
}

/**
 * File & Directory Tree Representation
 */
class FileSystemTree {
  constructor() {
    this.nodes = new Map();
    // Root Directory
    const rootDir = {
      id: 'root',
      name: 'root',
      parentId: null,
      type: 'folder',
      children: []
    };
    this.nodes.set('root', rootDir);
  }

  createFolder(name, parentId = 'root') {
    const parent = this.nodes.get(parentId);
    if (!parent || parent.type !== 'folder') throw new Error("Invalid parent directory.");

    // Check duplicate name in parent
    const exists = parent.children.some(childId => {
      const child = this.nodes.get(childId);
      return child && child.name.toLowerCase() === name.toLowerCase();
    });

    if (exists) {
      throw new Error(`An item named "${name}" already exists in this folder.`);
    }

    const folderId = 'dir_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const newFolder = {
      id: folderId,
      name,
      parentId,
      type: 'folder',
      children: []
    };

    this.nodes.set(folderId, newFolder);
    parent.children.push(folderId);
    return newFolder;
  }

  createFile(fileData, parentId = 'root') {
    const parent = this.nodes.get(parentId);
    if (!parent || parent.type !== 'folder') throw new Error("Invalid parent directory.");

    const exists = parent.children.some(childId => {
      const child = this.nodes.get(childId);
      return child && child.name.toLowerCase() === fileData.name.toLowerCase();
    });

    if (exists) {
      throw new Error(`A file named "${fileData.name}" already exists in this folder.`);
    }

    const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const newFile = {
      id: fileId,
      parentId,
      type: 'file',
      ...fileData
    };

    this.nodes.set(fileId, newFile);
    parent.children.push(fileId);
    return newFile;
  }

  deleteNode(id) {
    if (id === 'root') throw new Error("Cannot delete the root directory.");
    const node = this.nodes.get(id);
    if (!node) return;

    if (node.type === 'folder' && node.children.length > 0) {
      throw new Error(`Directory "${node.name}" is not empty! Delete its contents first.`);
    }

    // Remove from parent's children array
    const parent = this.nodes.get(node.parentId);
    if (parent) {
      parent.children = parent.children.filter(childId => childId !== id);
    }

    this.nodes.delete(id);
  }

  getPathString(nodeId) {
    const segments = [];
    let curr = this.nodes.get(nodeId);
    while (curr) {
      segments.unshift(curr.name);
      curr = curr.parentId ? this.nodes.get(curr.parentId) : null;
    }
    return '/' + segments.join('/');
  }

  getAllFiles() {
    const files = [];
    this.nodes.forEach(node => {
      if (node.type === 'file') files.push(node);
    });
    return files;
  }

  clear() {
    this.nodes.clear();
    const rootDir = {
      id: 'root',
      name: 'root',
      parentId: null,
      type: 'folder',
      children: []
    };
    this.nodes.set('root', rootDir);
  }
}

/**
 * Main File System Simulator Engine
 */
class FileSystemSimulator {
  constructor() {
    this.disk = new VirtualDisk(TOTAL_BLOCKS);
    this.tree = new FileSystemTree();
    this.currentFolderId = 'root';
    this.allocationMethod = 'contiguous'; // 'contiguous' | 'linked' | 'indexed'
    this.colorIndex = 0;
  }

  getNextColor() {
    const color = FILE_PALETTE[this.colorIndex % FILE_PALETTE.length];
    this.colorIndex++;
    return color;
  }

  setAllocationMethod(method) {
    if (!['contiguous', 'linked', 'indexed'].includes(method)) return;
    this.allocationMethod = method;
    this.formatDisk();
  }

  formatDisk() {
    this.disk.format();
    this.tree.clear();
    this.currentFolderId = 'root';
    this.colorIndex = 0;
  }

  /**
   * Splits string content into 8-byte chunks for block storage
   */
  chunkContent(content) {
    if (!content || content.length === 0) return [""];
    const chunks = [];
    for (let i = 0; i < content.length; i += BLOCK_SIZE) {
      chunks.push(content.substring(i, i + BLOCK_SIZE));
    }
    return chunks;
  }

  // =========================================================================
  // FILE ALLOCATION STRATEGIES (VIVA CORE EXPLANATION)
  // =========================================================================

  /**
   * 1. CONTIGUOUS ALLOCATION
   * OS Concept: Each file occupies a set of contiguous blocks on disk.
   * Advantages: Fast direct access, simple directory entry (Start Block + Length).
   * Disadvantages: Susceptible to External Fragmentation (free blocks exist but aren't contiguous).
   */
  allocateContiguous(fileId, fileName, content, color) {
    const chunks = this.chunkContent(content);
    const neededBlocks = chunks.length;
    const freeCount = this.disk.getFreeBlockCount();

    if (neededBlocks > freeCount) {
      throw new Error(`[Disk Full] Requires ${neededBlocks} blocks, but only ${freeCount} free blocks remain.`);
    }

    const startBlock = this.disk.findContiguousRun(neededBlocks);

    // KEY OS DEMONSTRATION: External Fragmentation check!
    if (startBlock === -1) {
      const maxRun = this.disk.getMaxContiguousRun();
      throw new Error(`[External Fragmentation] Total ${freeCount} free blocks exist, but largest contiguous chunk is only ${maxRun} blocks. Cannot allocate ${neededBlocks} consecutive blocks!`);
    }

    const allocatedBlockIndices = [];
    for (let i = 0; i < neededBlocks; i++) {
      const blockIdx = startBlock + i;
      const blk = this.disk.blocks[blockIdx];
      blk.isFree = false;
      blk.fileId = fileId;
      blk.fileName = fileName;
      blk.data = chunks[i];
      blk.nextBlock = -1;
      blk.isIndexBlock = false;
      blk.color = color;
      allocatedBlockIndices.push(blockIdx);
    }

    return {
      blocks: allocatedBlockIndices,
      allocInfo: {
        method: 'contiguous',
        startBlock: startBlock,
        length: neededBlocks
      }
    };
  }

  /**
   * 2. LINKED ALLOCATION
   * OS Concept: Each block contains a pointer to the next block (-1 for EOF).
   * Advantages: No external fragmentation; any free block can be used.
   * Disadvantages: No direct/random access (must traverse sequentially); pointer overhead.
   */
  allocateLinked(fileId, fileName, content, color) {
    const chunks = this.chunkContent(content);
    const neededBlocks = chunks.length;
    const freeCount = this.disk.getFreeBlockCount();

    if (neededBlocks > freeCount) {
      throw new Error(`[Disk Full] Requires ${neededBlocks} blocks, but only ${freeCount} free blocks remain.`);
    }

    const freeIndices = this.disk.getFreeBlockIndices(neededBlocks);

    for (let i = 0; i < neededBlocks; i++) {
      const blockIdx = freeIndices[i];
      const nextIdx = (i === neededBlocks - 1) ? -1 : freeIndices[i + 1];
      const blk = this.disk.blocks[blockIdx];

      blk.isFree = false;
      blk.fileId = fileId;
      blk.fileName = fileName;
      blk.data = chunks[i];
      blk.nextBlock = nextIdx;
      blk.isIndexBlock = false;
      blk.color = color;
    }

    return {
      blocks: freeIndices,
      allocInfo: {
        method: 'linked',
        startBlock: freeIndices[0],
        endBlock: freeIndices[freeIndices.length - 1],
        chain: freeIndices
      }
    };
  }

  /**
   * 3. INDEXED ALLOCATION
   * OS Concept: An Index Block stores an array of pointers to individual data blocks.
   * Advantages: Supports direct access without external fragmentation.
   * Disadvantages: Pointer overhead of dedicated index blocks even for small files.
   */
  allocateIndexed(fileId, fileName, content, color) {
    const chunks = this.chunkContent(content);
    const neededDataBlocks = chunks.length;
    const totalNeeded = neededDataBlocks + 1; // 1 Index Block + Data Blocks
    const freeCount = this.disk.getFreeBlockCount();

    if (totalNeeded > freeCount) {
      throw new Error(`[Disk Full] Requires ${totalNeeded} blocks (1 Index + ${neededDataBlocks} Data), but only ${freeCount} free blocks remain.`);
    }

    const freeIndices = this.disk.getFreeBlockIndices(totalNeeded);
    const indexBlockIdx = freeIndices[0];
    const dataBlockIndices = freeIndices.slice(1);

    // Setup the Index Block
    const idxBlock = this.disk.blocks[indexBlockIdx];
    idxBlock.isFree = false;
    idxBlock.fileId = fileId;
    idxBlock.fileName = fileName;
    idxBlock.data = `[IDX:${dataBlockIndices.join(',')}]`;
    idxBlock.nextBlock = -1;
    idxBlock.isIndexBlock = true;
    idxBlock.indexPointers = [...dataBlockIndices];
    idxBlock.color = color;

    // Setup Data Blocks
    for (let i = 0; i < neededDataBlocks; i++) {
      const dataIdx = dataBlockIndices[i];
      const dBlk = this.disk.blocks[dataIdx];
      dBlk.isFree = false;
      dBlk.fileId = fileId;
      dBlk.fileName = fileName;
      dBlk.data = chunks[i];
      dBlk.nextBlock = -1;
      dBlk.isIndexBlock = false;
      dBlk.color = color;
    }

    return {
      blocks: [indexBlockIdx, ...dataBlockIndices],
      allocInfo: {
        method: 'indexed',
        indexBlock: indexBlockIdx,
        dataBlocks: dataBlockIndices
      }
    };
  }

  /**
   * Allocates disk blocks according to active allocation strategy
   */
  allocate(fileId, fileName, content, color) {
    switch (this.allocationMethod) {
      case 'contiguous':
        return this.allocateContiguous(fileId, fileName, content, color);
      case 'linked':
        return this.allocateLinked(fileId, fileName, content, color);
      case 'indexed':
        return this.allocateIndexed(fileId, fileName, content, color);
      default:
        throw new Error("Unknown allocation method.");
    }
  }

  createFile(name, content, parentId = this.currentFolderId) {
    const color = this.getNextColor();
    const tempFileId = 'file_' + Date.now();

    // Perform allocation on disk
    const allocResult = this.allocate(tempFileId, name, content, color);

    try {
      const fileNode = this.tree.createFile({
        name,
        content,
        size: content.length,
        color,
        blocks: allocResult.blocks,
        allocInfo: allocResult.allocInfo
      }, parentId);

      // Link correct permanent ID on disk blocks
      allocResult.blocks.forEach(idx => {
        this.disk.blocks[idx].fileId = fileNode.id;
      });

      return fileNode;
    } catch (err) {
      // Rollback disk allocation if tree insertion failed
      this.disk.freeFileBlocks(tempFileId);
      throw err;
    }
  }

  writeFile(fileId, newContent) {
    const fileNode = this.tree.nodes.get(fileId);
    if (!fileNode || fileNode.type !== 'file') throw new Error("File not found.");

    // Temporarily free old blocks to test re-allocation
    const oldBlocks = [...fileNode.blocks];
    const oldAllocInfo = { ...fileNode.allocInfo };
    const oldContent = fileNode.content;
    const oldSize = fileNode.size;

    this.disk.freeFileBlocks(fileId);

    try {
      const allocResult = this.allocate(fileId, fileNode.name, newContent, fileNode.color);
      fileNode.content = newContent;
      fileNode.size = newContent.length;
      fileNode.blocks = allocResult.blocks;
      fileNode.allocInfo = allocResult.allocInfo;
      return fileNode;
    } catch (err) {
      // Revert if write/reallocate failed (e.g. fragmentation on resize)
      // Restore previous state
      if (this.allocationMethod === 'contiguous') {
        this.allocateContiguous(fileId, fileNode.name, oldContent, fileNode.color);
      } else if (this.allocationMethod === 'linked') {
        this.allocateLinked(fileId, fileNode.name, oldContent, fileNode.color);
      } else {
        this.allocateIndexed(fileId, fileNode.name, oldContent, fileNode.color);
      }
      fileNode.content = oldContent;
      fileNode.size = oldSize;
      fileNode.blocks = oldBlocks;
      fileNode.allocInfo = oldAllocInfo;
      throw err;
    }
  }

  deleteFile(fileId) {
    const fileNode = this.tree.nodes.get(fileId);
    if (!fileNode) throw new Error("File not found.");
    this.disk.freeFileBlocks(fileId);
    this.tree.deleteNode(fileId);
  }

  createFolder(name, parentId = this.currentFolderId) {
    return this.tree.createFolder(name, parentId);
  }

  deleteFolder(folderId) {
    this.tree.deleteNode(folderId);
  }

  readFile(fileId) {
    const fileNode = this.tree.nodes.get(fileId);
    if (!fileNode) throw new Error("File not found.");
    return fileNode;
  }
}

/**
 * UI Controller and DOM Event Binder
 */
class UIController {
  constructor(fs) {
    this.fs = fs;
    this.highlightedFileId = null;
    this.initDOM();
    this.bindEvents();
    this.render();
    this.log("System initialized with " + this.fs.allocationMethod.toUpperCase() + " allocation.", "INFO");
  }

  initDOM() {
    // Theme toggle
    this.themeToggle = document.getElementById('themeToggle');
    this.allocationSelect = document.getElementById('allocationSelect');
    this.btnLoadDemo = document.getElementById('btnLoadDemo');
    this.btnFormatDisk = document.getElementById('btnFormatDisk');

    // Method Banner
    this.bannerTitle = document.getElementById('bannerTitle');
    this.bannerDesc = document.getElementById('bannerDesc');
    this.methodBanner = document.getElementById('methodBanner');

    // Disk Stats
    this.diskUsageBadge = document.getElementById('diskUsageBadge');
    this.diskProgressBar = document.getElementById('diskProgressBar');
    this.statFreeBlocks = document.getElementById('statFreeBlocks');
    this.statUsedBlocks = document.getElementById('statUsedBlocks');
    this.statMaxRun = document.getElementById('statMaxRun');
    this.statTotalFiles = document.getElementById('statTotalFiles');
    this.diskGrid = document.getElementById('diskGrid');
    this.diskTooltip = document.getElementById('diskTooltip');

    // Explorer
    this.explorerCountBadge = document.getElementById('explorerCountBadge');
    this.btnNewFolder = document.getElementById('btnNewFolder');
    this.btnNewFile = document.getElementById('btnNewFile');
    this.btnGoUp = document.getElementById('btnGoUp');
    this.breadcrumbs = document.getElementById('breadcrumbs');
    this.directoryList = document.getElementById('directoryList');

    // FAT
    this.fatMethodLabel = document.getElementById('fatMethodLabel');
    this.fatSpecificColHeader = document.getElementById('fatSpecificColHeader');
    this.fatTableBody = document.getElementById('fatTableBody');

    // Logs
    this.logContainer = document.getElementById('logContainer');
    this.btnClearLog = document.getElementById('btnClearLog');

    // File Modal
    this.fileModalBackdrop = document.getElementById('fileModalBackdrop');
    this.fileModalTitle = document.getElementById('fileModalTitle');
    this.fileEditOriginalName = document.getElementById('fileEditOriginalName');
    this.inputFileName = document.getElementById('inputFileName');
    this.inputFileContent = document.getElementById('inputFileContent');
    this.charCountLabel = document.getElementById('charCountLabel');
    this.blockEstimateLabel = document.getElementById('blockEstimateLabel');
    this.indexBlockEstimateLabel = document.getElementById('indexBlockEstimateLabel');
    this.btnFileModalClose = document.getElementById('btnFileModalClose');
    this.btnFileModalCancel = document.getElementById('btnFileModalCancel');
    this.btnFileModalSave = document.getElementById('btnFileModalSave');

    // Folder Modal
    this.folderModalBackdrop = document.getElementById('folderModalBackdrop');
    this.inputFolderName = document.getElementById('inputFolderName');
    this.btnFolderModalClose = document.getElementById('btnFolderModalClose');
    this.btnFolderModalCancel = document.getElementById('btnFolderModalCancel');
    this.btnFolderModalCreate = document.getElementById('btnFolderModalCreate');

    // Read Modal
    this.readModalBackdrop = document.getElementById('readModalBackdrop');
    this.readFileNameTitle = document.getElementById('readFileNameTitle');
    this.readFileMethodBadge = document.getElementById('readFileMethodBadge');
    this.readFilePath = document.getElementById('readFilePath');
    this.readFileSize = document.getElementById('readFileSize');
    this.readFileAllocInfo = document.getElementById('readFileAllocInfo');
    this.readTraversalChain = document.getElementById('readTraversalChain');
    this.readFileContent = document.getElementById('readFileContent');
    this.btnReadModalClose = document.getElementById('btnReadModalClose');
    this.btnReadModalCloseBottom = document.getElementById('btnReadModalCloseBottom');

    // Initialize 64 grid elements once for performance
    this.diskGrid.innerHTML = '';
    for (let i = 0; i < TOTAL_BLOCKS; i++) {
      const blockEl = document.createElement('div');
      blockEl.className = 'disk-block';
      blockEl.dataset.blockIndex = i;
      blockEl.innerHTML = `
        <span class="block-id">${i}</span>
        <span class="block-label"></span>
        <span class="block-sub"></span>
      `;
      this.diskGrid.appendChild(blockEl);
    }
  }

  bindEvents() {
    // Theme toggle
    this.themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
    });

    // Allocation Select
    this.allocationSelect.addEventListener('change', (e) => {
      const method = e.target.value;
      const fileCount = this.fs.tree.getAllFiles().length;
      if (fileCount > 0) {
        const confirmSwitch = confirm(`Switching allocation method to ${method.toUpperCase()} will format the virtual disk. Continue?`);
        if (!confirmSwitch) {
          this.allocationSelect.value = this.fs.allocationMethod;
          return;
        }
      }
      this.fs.setAllocationMethod(method);
      this.log(`Switched allocation scheme to ${method.toUpperCase()}. Disk reformatted.`, 'ALLOC');
      this.updateMethodBanner();
      this.render();
    });

    // Load Demo Data
    this.btnLoadDemo.addEventListener('click', () => {
      this.loadDemoData();
    });

    // Format Disk
    this.btnFormatDisk.addEventListener('click', () => {
      if (confirm("Are you sure you want to format the disk? All files and folders will be deleted.")) {
        this.fs.formatDisk();
        this.highlightedFileId = null;
        this.log("Virtual Disk formatted. All 64 blocks are now free.", "WARN");
        this.render();
      }
    });

    // Clear Log
    this.btnClearLog.addEventListener('click', () => {
      this.logContainer.innerHTML = '';
    });

    // New Folder / File Buttons
    this.btnNewFolder.addEventListener('click', () => this.openFolderModal());
    this.btnNewFile.addEventListener('click', () => this.openFileModal());

    // Navigation Up
    this.btnGoUp.addEventListener('click', () => {
      const curr = this.fs.tree.nodes.get(this.fs.currentFolderId);
      if (curr && curr.parentId) {
        this.fs.currentFolderId = curr.parentId;
        this.render();
      }
    });

    // File Modal Events
    this.btnFileModalClose.addEventListener('click', () => this.closeFileModal());
    this.btnFileModalCancel.addEventListener('click', () => this.closeFileModal());
    this.btnFileModalSave.addEventListener('click', () => this.handleSaveFile());
    this.inputFileContent.addEventListener('input', () => this.updateModalCharCount());

    // Folder Modal Events
    this.btnFolderModalClose.addEventListener('click', () => this.closeFolderModal());
    this.btnFolderModalCancel.addEventListener('click', () => this.closeFolderModal());
    this.btnFolderModalCreate.addEventListener('click', () => this.handleCreateFolder());

    // Read Modal Events
    this.btnReadModalClose.addEventListener('click', () => this.closeReadModal());
    this.btnReadModalCloseBottom.addEventListener('click', () => this.closeReadModal());

    // Disk Grid Tooltips & Highlights
    this.diskGrid.addEventListener('mouseover', (e) => this.handleBlockHover(e));
    this.diskGrid.addEventListener('mousemove', (e) => this.handleBlockMove(e));
    this.diskGrid.addEventListener('mouseout', () => this.hideTooltip());

    // Enter key submits for modals
    this.inputFolderName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleCreateFolder();
    });
  }

  log(message, type = 'INFO') {
    const line = document.createElement('div');
    line.className = 'log-line';

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const timeEl = document.createElement('span');
    timeEl.className = 'log-time';
    timeEl.textContent = timeStr;

    const tagEl = document.createElement('span');
    tagEl.className = `log-tag tag-${type.toLowerCase()}`;
    tagEl.textContent = type;

    const msgEl = document.createElement('span');
    msgEl.className = 'log-msg';
    msgEl.textContent = message;

    line.appendChild(timeEl);
    line.appendChild(tagEl);
    line.appendChild(msgEl);

    this.logContainer.prepend(line);
  }

  updateMethodBanner() {
    const method = this.fs.allocationMethod;
    if (method === 'contiguous') {
      this.bannerTitle.textContent = "Contiguous Allocation";
      this.bannerDesc.innerHTML = "Files occupy consecutive disk blocks. Offers fast direct access with simple (Start, Length) directory entries, but suffers from <strong>External Fragmentation</strong> when contiguous runs don't fit.";
      this.fatMethodLabel.textContent = "Contiguous (Start Block, Length)";
      this.fatSpecificColHeader.textContent = "Start & Length";
    } else if (method === 'linked') {
      this.bannerTitle.textContent = "Linked Allocation";
      this.bannerDesc.innerHTML = "Each block contains a pointer to the next block (Chain: Block ➔ Next Block ➔ EOF). <strong>Eliminates External Fragmentation</strong> completely, but requires sequential traversal.";
      this.fatMethodLabel.textContent = "Linked (Start Block, End Block, Pointer Chain)";
      this.fatSpecificColHeader.textContent = "Start ➔ End Chain";
    } else if (method === 'indexed') {
      this.bannerTitle.textContent = "Indexed Allocation";
      this.bannerDesc.innerHTML = "Each file has a dedicated <strong>Index Block (marked with dashed outline)</strong> holding pointers to its data blocks. Enables direct access without external fragmentation.";
      this.fatMethodLabel.textContent = "Indexed (Index Block ➔ Data Pointers)";
      this.fatSpecificColHeader.textContent = "Index Block & Data Blocks";
    }
  }

  render() {
    this.renderStats();
    this.renderDiskGrid();
    this.renderBreadcrumbs();
    this.renderDirectoryList();
    this.renderFAT();
    this.updateMethodBanner();
  }

  renderStats() {
    const free = this.fs.disk.getFreeBlockCount();
    const used = this.fs.disk.getUsedBlockCount();
    const maxRun = this.fs.disk.getMaxContiguousRun();
    const allFiles = this.fs.tree.getAllFiles();
    const pct = Math.round((used / TOTAL_BLOCKS) * 100);

    this.diskUsageBadge.textContent = `${used} / ${TOTAL_BLOCKS} Blocks Used (${pct}%)`;
    this.diskProgressBar.style.width = `${pct}%`;
    this.statFreeBlocks.textContent = free;
    this.statUsedBlocks.textContent = used;
    this.statMaxRun.textContent = maxRun;
    this.statTotalFiles.textContent = allFiles.length;
  }

  renderDiskGrid() {
    const blockElements = this.diskGrid.children;

    for (let i = 0; i < TOTAL_BLOCKS; i++) {
      const blk = this.fs.disk.blocks[i];
      const el = blockElements[i];

      // Reset classes
      el.className = 'disk-block';
      el.style.backgroundColor = '';
      el.style.borderColor = '';

      const lbl = el.querySelector('.block-label');
      const sub = el.querySelector('.block-sub');

      if (blk.isFree) {
        lbl.textContent = '';
        sub.textContent = 'FREE';
      } else {
        el.classList.add('used');
        el.style.backgroundColor = blk.color;

        if (blk.isIndexBlock) {
          el.classList.add('index-block');
          lbl.textContent = blk.fileName;
          sub.textContent = `[IDX]`;
        } else {
          lbl.textContent = blk.fileName;
          if (this.fs.allocationMethod === 'linked') {
            sub.textContent = blk.nextBlock === -1 ? 'EOF' : `➔ ${blk.nextBlock}`;
          } else {
            sub.textContent = `"${blk.data.substring(0, 4)}..."`;
          }
        }

        // Highlight if matches selected file
        if (this.highlightedFileId && blk.fileId === this.highlightedFileId) {
          el.classList.add('highlighted');
        }
      }
    }
  }

  renderBreadcrumbs() {
    const currFolder = this.fs.tree.nodes.get(this.fs.currentFolderId);
    this.btnGoUp.disabled = !currFolder || !currFolder.parentId;

    const segments = [];
    let curr = currFolder;
    while (curr) {
      segments.unshift(curr);
      curr = curr.parentId ? this.fs.tree.nodes.get(curr.parentId) : null;
    }

    this.breadcrumbs.innerHTML = '';
    segments.forEach((seg, index) => {
      const crumb = document.createElement('span');
      crumb.className = 'crumb';
      crumb.textContent = seg.name;
      crumb.addEventListener('click', () => {
        this.fs.currentFolderId = seg.id;
        this.render();
      });
      this.breadcrumbs.appendChild(crumb);

      if (index < segments.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'crumb-separator';
        sep.textContent = ' / ';
        this.breadcrumbs.appendChild(sep);
      }
    });
  }

  renderDirectoryList() {
    const currentFolder = this.fs.tree.nodes.get(this.fs.currentFolderId);
    this.directoryList.innerHTML = '';

    if (!currentFolder || currentFolder.children.length === 0) {
      this.directoryList.innerHTML = '<div class="dir-empty-msg">Directory is empty. Create a file or folder above.</div>';
      this.explorerCountBadge.textContent = '0 items';
      return;
    }

    this.explorerCountBadge.textContent = `${currentFolder.children.length} item${currentFolder.children.length > 1 ? 's' : ''}`;

    currentFolder.children.forEach(childId => {
      const node = this.fs.tree.nodes.get(childId);
      if (!node) return;

      const itemEl = document.createElement('div');
      itemEl.className = 'dir-item';

      const left = document.createElement('div');
      left.className = 'dir-item-left';

      const icon = document.createElement('span');
      icon.className = 'dir-icon';
      icon.textContent = node.type === 'folder' ? '📁' : '📄';

      const name = document.createElement('span');
      name.className = 'dir-name';
      name.textContent = node.name;

      left.appendChild(icon);
      left.appendChild(name);

      const right = document.createElement('div');
      right.className = 'dir-item-right';

      if (node.type === 'folder') {
        const btnOpen = document.createElement('button');
        btnOpen.className = 'btn btn-xs btn-secondary';
        btnOpen.textContent = 'Open';
        btnOpen.addEventListener('click', (e) => {
          e.stopPropagation();
          this.fs.currentFolderId = node.id;
          this.render();
        });

        const btnDel = document.createElement('button');
        btnDel.className = 'btn btn-xs btn-danger-sm';
        btnDel.innerHTML = '&times;';
        btnDel.title = 'Delete Folder';
        btnDel.addEventListener('click', (e) => {
          e.stopPropagation();
          try {
            this.fs.deleteFolder(node.id);
            this.log(`Deleted folder "${node.name}".`, 'INFO');
            this.render();
          } catch (err) {
            this.log(`[Error] ${err.message}`, 'ERROR');
            alert(err.message);
          }
        });

        right.appendChild(btnOpen);
        right.appendChild(btnDel);

        itemEl.addEventListener('click', () => {
          this.fs.currentFolderId = node.id;
          this.render();
        });
      } else {
        // File item
        const badge = document.createElement('span');
        badge.className = 'badge-subtle mono-cell';
        badge.textContent = `${node.size}B (${node.blocks.length} blk)`;

        const btnRead = document.createElement('button');
        btnRead.className = 'btn btn-xs btn-primary-outline';
        btnRead.textContent = 'Read';
        btnRead.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openReadModal(node.id);
        });

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn btn-xs btn-secondary';
        btnEdit.textContent = 'Edit';
        btnEdit.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openFileModal(node.id);
        });

        const btnDel = document.createElement('button');
        btnDel.className = 'btn btn-xs btn-danger-sm';
        btnDel.innerHTML = '&times;';
        btnDel.title = 'Delete File';
        btnDel.addEventListener('click', (e) => {
          e.stopPropagation();
          this.fs.deleteFile(node.id);
          this.log(`Deleted file "${node.name}" (freed ${node.blocks.length} blocks).`, 'INFO');
          if (this.highlightedFileId === node.id) this.highlightedFileId = null;
          this.render();
        });

        right.appendChild(badge);
        right.appendChild(btnRead);
        right.appendChild(btnEdit);
        right.appendChild(btnDel);

        itemEl.addEventListener('mouseenter', () => {
          this.highlightedFileId = node.id;
          this.renderDiskGrid();
        });
        itemEl.addEventListener('mouseleave', () => {
          this.highlightedFileId = null;
          this.renderDiskGrid();
        });
      }

      itemEl.appendChild(left);
      itemEl.appendChild(right);
      this.directoryList.appendChild(itemEl);
    });
  }

  renderFAT() {
    const allFiles = this.fs.tree.getAllFiles();
    this.fatTableBody.innerHTML = '';

    if (allFiles.length === 0) {
      this.fatTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-muted" style="text-align: center; padding: 1.25rem;">
            No files currently allocated on virtual disk.
          </td>
        </tr>
      `;
      return;
    }

    allFiles.forEach(file => {
      const tr = document.createElement('tr');
      const fullPath = this.fs.tree.getPathString(file.id);

      let allocInfoHTML = '';
      if (file.allocInfo.method === 'contiguous') {
        allocInfoHTML = `<span class="mono-cell">Start: <strong>${file.allocInfo.startBlock}</strong>, Len: <strong>${file.allocInfo.length}</strong> (Blocks: [${file.blocks.join(',')}])</span>`;
      } else if (file.allocInfo.method === 'linked') {
        allocInfoHTML = `<span class="mono-cell">Start: <strong>${file.allocInfo.startBlock}</strong> ➔ End: <strong>${file.allocInfo.endBlock}</strong> (Chain: ${file.blocks.join(' ➔ ')})</span>`;
      } else if (file.allocInfo.method === 'indexed') {
        allocInfoHTML = `<span class="mono-cell">Index: <strong>[${file.allocInfo.indexBlock}]</strong> ➔ Data: [${file.allocInfo.dataBlocks.join(', ')}]</span>`;
      }

      tr.innerHTML = `
        <td><span class="file-color-pill" style="background-color: ${file.color}"></span></td>
        <td><strong>${file.name}</strong></td>
        <td class="mono-cell text-muted">${fullPath}</td>
        <td class="mono-cell">${file.size} B</td>
        <td class="mono-cell">${file.blocks.length}</td>
        <td>${allocInfoHTML}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-xs btn-primary-outline" data-action="read" data-file-id="${file.id}">Read</button>
            <button class="btn btn-xs btn-secondary" data-action="edit" data-file-id="${file.id}">Edit</button>
            <button class="btn btn-xs btn-danger-sm" data-action="del" data-file-id="${file.id}">&times;</button>
          </div>
        </td>
      `;

      tr.addEventListener('mouseenter', () => {
        this.highlightedFileId = file.id;
        this.renderDiskGrid();
      });

      tr.addEventListener('mouseleave', () => {
        this.highlightedFileId = null;
        this.renderDiskGrid();
      });

      tr.querySelector('[data-action="read"]').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openReadModal(file.id);
      });

      tr.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openFileModal(file.id);
      });

      tr.querySelector('[data-action="del"]').addEventListener('click', (e) => {
        e.stopPropagation();
        this.fs.deleteFile(file.id);
        this.log(`Deleted file "${file.name}" via FAT.`, 'INFO');
        if (this.highlightedFileId === file.id) this.highlightedFileId = null;
        this.render();
      });

      this.fatTableBody.appendChild(tr);
    });
  }

  // =========================================================================
  // MODAL HANDLERS
  // =========================================================================

  openFileModal(editFileId = null) {
    if (editFileId) {
      const file = this.fs.tree.nodes.get(editFileId);
      if (!file) return;
      this.fileModalTitle.textContent = `Edit File: ${file.name}`;
      this.fileEditOriginalName.value = file.id;
      this.inputFileName.value = file.name;
      this.inputFileName.disabled = true; // In edit mode, name is fixed
      this.inputFileContent.value = file.content;
    } else {
      this.fileModalTitle.textContent = "Create New File";
      this.fileEditOriginalName.value = "";
      this.inputFileName.value = "";
      this.inputFileName.disabled = false;
      this.inputFileContent.value = "";
    }

    this.updateModalCharCount();
    this.fileModalBackdrop.style.display = 'flex';
    this.inputFileName.focus();
  }

  closeFileModal() {
    this.fileModalBackdrop.style.display = 'none';
  }

  updateModalCharCount() {
    const chars = this.inputFileContent.value.length;
    const dataBlocks = Math.max(1, Math.ceil(chars / BLOCK_SIZE));
    this.charCountLabel.textContent = `${chars} character${chars === 1 ? '' : 's'}`;
    this.blockEstimateLabel.textContent = `Requires ${dataBlocks} data block${dataBlocks > 1 ? 's' : ''}`;

    if (this.fs.allocationMethod === 'indexed') {
      this.indexBlockEstimateLabel.style.display = 'inline';
      this.indexBlockEstimateLabel.textContent = `(+1 index block = ${dataBlocks + 1} total)`;
    } else {
      this.indexBlockEstimateLabel.style.display = 'none';
    }
  }

  handleSaveFile() {
    const editFileId = this.fileEditOriginalName.value;
    const fileName = this.inputFileName.value.trim();
    const content = this.inputFileContent.value;

    if (!editFileId && !fileName) {
      alert("Please enter a file name.");
      this.inputFileName.focus();
      return;
    }

    try {
      if (editFileId) {
        // Write / Edit existing file
        const updated = this.fs.writeFile(editFileId, content);
        this.log(`[Write File] Updated "${updated.name}" (${updated.size} chars, ${updated.blocks.length} blocks).`, 'SUCCESS');
      } else {
        // Create new file
        const created = this.fs.createFile(fileName, content);
        let allocDetails = '';
        if (created.allocInfo.method === 'contiguous') {
          allocDetails = `Start: ${created.allocInfo.startBlock}, Len: ${created.allocInfo.length}`;
        } else if (created.allocInfo.method === 'linked') {
          allocDetails = `Start: ${created.allocInfo.startBlock}, End: ${created.allocInfo.endBlock}`;
        } else {
          allocDetails = `Idx: ${created.allocInfo.indexBlock}, Data: [${created.allocInfo.dataBlocks.join(',')}]`;
        }
        this.log(`[Create File] Allocated "${created.name}" (${allocDetails}).`, 'SUCCESS');
      }

      this.closeFileModal();
      this.render();
    } catch (err) {
      this.log(`[Allocation Error] ${err.message}`, 'ERROR');
      alert(`Operation Failed:\n${err.message}`);
    }
  }

  openFolderModal() {
    this.inputFolderName.value = '';
    this.folderModalBackdrop.style.display = 'flex';
    this.inputFolderName.focus();
  }

  closeFolderModal() {
    this.folderModalBackdrop.style.display = 'none';
  }

  handleCreateFolder() {
    const name = this.inputFolderName.value.trim();
    if (!name) {
      alert("Please enter a folder name.");
      this.inputFolderName.focus();
      return;
    }

    try {
      const folder = this.fs.createFolder(name);
      this.log(`[Mkdir] Created directory "${folder.name}".`, 'SUCCESS');
      this.closeFolderModal();
      this.render();
    } catch (err) {
      this.log(`[Mkdir Error] ${err.message}`, 'ERROR');
      alert(err.message);
    }
  }

  openReadModal(fileId) {
    const file = this.fs.readFile(fileId);
    if (!file) return;

    this.readFileNameTitle.textContent = `File: ${file.name}`;
    this.readFileMethodBadge.textContent = this.fs.allocationMethod.toUpperCase();
    this.readFilePath.textContent = this.fs.tree.getPathString(file.id);
    this.readFileSize.textContent = `${file.size} characters (${file.blocks.length} blocks)`;

    // Render Traversal Chain Visualizer
    this.readTraversalChain.innerHTML = '';

    if (file.allocInfo.method === 'contiguous') {
      this.readFileAllocInfo.textContent = `Start Block: ${file.allocInfo.startBlock}, Length: ${file.allocInfo.length}`;

      file.blocks.forEach((blkIdx, i) => {
        const blk = this.fs.disk.blocks[blkIdx];
        const node = document.createElement('div');
        node.className = 'traversal-node';
        node.innerHTML = `
          <span class="node-title">Block #${blkIdx}</span>
          <span class="node-content-preview">"${blk.data}"</span>
        `;
        this.readTraversalChain.appendChild(node);

        if (i < file.blocks.length - 1) {
          const arrow = document.createElement('span');
          arrow.className = 'traversal-arrow';
          arrow.textContent = '➔';
          this.readTraversalChain.appendChild(arrow);
        }
      });

    } else if (file.allocInfo.method === 'linked') {
      this.readFileAllocInfo.textContent = `Start: ${file.allocInfo.startBlock}, End: ${file.allocInfo.endBlock}`;

      file.blocks.forEach((blkIdx, i) => {
        const blk = this.fs.disk.blocks[blkIdx];
        const node = document.createElement('div');
        node.className = 'traversal-node';
        node.innerHTML = `
          <span class="node-title">Block #${blkIdx}</span>
          <span class="node-content-preview">"${blk.data}"</span>
          <small class="text-muted" style="font-size:0.65rem;">Next: ${blk.nextBlock === -1 ? 'EOF (-1)' : '#' + blk.nextBlock}</small>
        `;
        this.readTraversalChain.appendChild(node);

        if (i < file.blocks.length - 1) {
          const arrow = document.createElement('span');
          arrow.className = 'traversal-arrow';
          arrow.textContent = '➔';
          this.readTraversalChain.appendChild(arrow);
        }
      });

    } else if (file.allocInfo.method === 'indexed') {
      this.readFileAllocInfo.textContent = `Index Block: #${file.allocInfo.indexBlock}, Data: [${file.allocInfo.dataBlocks.join(', ')}]`;

      // Index Block Chip
      const idxNode = document.createElement('div');
      idxNode.className = 'traversal-node index-node';
      idxNode.innerHTML = `
        <span class="node-title">INDEX BLOCK #${file.allocInfo.indexBlock}</span>
        <span class="node-content-preview">Pointers: [${file.allocInfo.dataBlocks.join(', ')}]</span>
      `;
      this.readTraversalChain.appendChild(idxNode);

      const arrow = document.createElement('span');
      arrow.className = 'traversal-arrow';
      arrow.textContent = '──►';
      this.readTraversalChain.appendChild(arrow);

      file.allocInfo.dataBlocks.forEach((dataIdx, i) => {
        const blk = this.fs.disk.blocks[dataIdx];
        const dataNode = document.createElement('div');
        dataNode.className = 'traversal-node';
        dataNode.innerHTML = `
          <span class="node-title">Data Block #${dataIdx}</span>
          <span class="node-content-preview">"${blk.data}"</span>
        `;
        this.readTraversalChain.appendChild(dataNode);

        if (i < file.allocInfo.dataBlocks.length - 1) {
          const subSep = document.createElement('span');
          subSep.className = 'traversal-arrow';
          subSep.textContent = '+';
          this.readTraversalChain.appendChild(subSep);
        }
      });
    }

    this.readFileContent.textContent = file.content.length > 0 ? file.content : '(Empty file)';
    this.readModalBackdrop.style.display = 'flex';
    this.log(`[Read File] Traversed "${file.name}" across ${file.blocks.length} disk blocks.`, 'INFO');
  }

  closeReadModal() {
    this.readModalBackdrop.style.display = 'none';
  }

  // =========================================================================
  // TOOLTIP & HOVER INTERACTIONS
  // =========================================================================

  handleBlockHover(e) {
    const blockEl = e.target.closest('.disk-block');
    if (!blockEl) return;

    const blockIdx = parseInt(blockEl.dataset.blockIndex, 10);
    const blk = this.fs.disk.blocks[blockIdx];

    let tooltipHTML = `<div class="tt-title">Block #${blockIdx}</div>`;

    if (blk.isFree) {
      tooltipHTML += `<div class="tt-row"><span class="tt-label">Status:</span><span class="tt-val" style="color:#3fb950;">FREE</span></div>`;
    } else {
      tooltipHTML += `
        <div class="tt-row"><span class="tt-label">Status:</span><span class="tt-val" style="color:#f0883e;">ALLOCATED</span></div>
        <div class="tt-row"><span class="tt-label">File:</span><span class="tt-val">${blk.fileName}</span></div>
      `;

      if (blk.isIndexBlock) {
        tooltipHTML += `
          <div class="tt-row"><span class="tt-label">Type:</span><span class="tt-val" style="color:#8957e5;">Index Block</span></div>
          <div class="tt-row"><span class="tt-label">Points to:</span><span class="tt-val">[${blk.indexPointers.join(', ')}]</span></div>
        `;
      } else {
        tooltipHTML += `
          <div class="tt-row"><span class="tt-label">Data:</span><span class="tt-val">"${blk.data}"</span></div>
        `;
        if (this.fs.allocationMethod === 'linked') {
          tooltipHTML += `
            <div class="tt-row"><span class="tt-label">Next Block:</span><span class="tt-val">${blk.nextBlock === -1 ? 'EOF (-1)' : blk.nextBlock}</span></div>
          `;
        }
      }
    }

    this.diskTooltip.innerHTML = tooltipHTML;
    this.diskTooltip.style.display = 'block';
  }

  handleBlockMove(e) {
    if (this.diskTooltip.style.display === 'block') {
      const offsetX = 15;
      const offsetY = 15;
      let left = e.clientX + offsetX;
      let top = e.clientY + offsetY;

      // Prevent overflow outside viewport
      if (left + 260 > window.innerWidth) {
        left = e.clientX - 270;
      }
      if (top + 150 > window.innerHeight) {
        top = e.clientY - 160;
      }

      this.diskTooltip.style.left = `${left}px`;
      this.diskTooltip.style.top = `${top}px`;
    }
  }

  hideTooltip() {
    this.diskTooltip.style.display = 'none';
  }

  // =========================================================================
  // DEMO DATA GENERATOR (SHOWCASE FRAGMENTATION)
  // =========================================================================

  /**
   * Loads carefully crafted demo data that quickly illustrates External Fragmentation:
   * 1. Allocates File A (4 blocks = 32 chars) -> occupies blocks 0..3
   * 2. Allocates File B (4 blocks = 32 chars) -> occupies blocks 4..7
   * 3. Allocates File C (4 blocks = 32 chars) -> occupies blocks 8..11
   * 4. Allocates File D (4 blocks = 32 chars) -> occupies blocks 12..15
   * 5. Deletes File B (frees 4..7) and File D (frees 12..15)
   * 6. Creates a nested directory /root/documents with a file inside.
   * Result in Contiguous mode: Free holes exist at [4..7] and [12..15].
   * If a user tries creating a 6-block file, it cannot fit in either 4-block hole!
   */
  loadDemoData() {
    this.fs.formatDisk();

    try {
      // Step 1: Create 4 initial files
      const fA = this.fs.createFile("alpha.txt", "AlphaOS_File_Block0_to_Block3_Data!!");
      const fB = this.fs.createFile("beta.txt", "BetaData_WillBeDeleted_ToMakeHole!!");
      const fC = this.fs.createFile("gamma.txt", "GammaData_PreservedInBetweenBlocks!");
      const fD = this.fs.createFile("delta.txt", "DeltaData_WillAlsoBeDeletedHole2!!");

      // Step 2: Delete File B and File D to create holes in disk
      this.fs.deleteFile(fB.id);
      this.fs.deleteFile(fD.id);

      // Step 3: Create a subfolder with a file inside to demonstrate hierarchical directory tree
      const docFolder = this.fs.createFolder("documents");
      this.fs.createFile("project_report.doc", "OperatingSystems_Lab_Viva_Report2026", docFolder.id);

      this.log("Loaded Demo Data! Created scattered allocations and created free holes.", "SUCCESS");
      this.log("Demo Note: Try creating a 6-block file (e.g. 48 chars). In Contiguous mode, notice the external fragmentation demonstration!", "WARN");

      this.render();
    } catch (err) {
      this.log(`Error loading demo data: ${err.message}`, "ERROR");
    }
  }
}

// Initialize Application once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const fsSimulator = new FileSystemSimulator();
  window.app = new UIController(fsSimulator);
});
