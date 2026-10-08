# File System Implementation Simulator 📁⚙️
**Operating Systems Laboratory Project & Viva Demonstration**

An interactive, pure Vanilla HTML5/CSS3/JavaScript simulator that visualizes how an Operating System manages disk blocks, directory structures, and file allocation strategies.

---

## 🌟 Key Features

1. **64-Block Virtual Disk Grid**:
   - 64 distinct blocks (8 characters/bytes per block).
   - Free blocks rendered in neutral slate; each file is assigned its own unique glowing color.
   - Index blocks dynamically highlighted with a dashed border and `[IDX]` badge.
   - Hover tooltips inspect block index, stored string data, next block pointers, or index tables.
   - Click/hover on any file in the FAT table to pulse-highlight its blocks on the disk.

2. **Full File Operations**:
   - **Create File**: Allocates blocks based on content length.
   - **Write / Edit**: Reallocates and resizes blocks on disk.
   - **Read**: Interactive modal showing exact character slices and a **visual step-by-step block traversal chain** with seek arrows.
   - **Delete**: Frees all allocated blocks and updates directory and FAT.

3. **Hierarchical Directory Tree**:
   - Nested folder creation (`mkdir`).
   - Folder navigation (`cd folder`, `cd ..`, and clickable breadcrumbs).
   - Prevents accidental deletion of non-empty folders.

4. **Three Core File Allocation Strategies**:
   - **Contiguous Allocation**: First-fit search for adjacent blocks. Detects and reports **External Fragmentation** when total free space exists but no contiguous run fits.
   - **Linked Allocation**: Stores next-block pointers in each block (`Block ➔ Next Block ➔ EOF`). Completely prevents external fragmentation.
   - **Indexed Allocation**: Dedicates an Index Block to hold an array of pointers to data blocks. Direct access without fragmentation.

5. **File Allocation Table (FAT)**:
   - Live system table displaying File Name, Full Path, File Size, Total Blocks, and Allocation specifics (Start/Length, Linked Chain, or Index Block).

6. **OS Kernel & Operation Log**:
   - Real-time scrolling activity log with timestamps and status tags (`[SUCCESS]`, `[ERROR]`, `[ALLOC]`, `[WARN]`, `[INFO]`).

7. **Aesthetics & Utilities**:
   - Dark / Light mode toggle.
   - "Load Demo Data" button specifically crafted to trigger external fragmentation.
   - "Format Disk" quick wipe.
   - Fully responsive layout for laptop and mobile screens.

---

## 🚀 How to Run

### 1. Live Online (Recommended)
You can open and interact with the live hosted simulator directly on any device:
👉 **[https://pjeeva140606.github.io/os-filesystem-simulator/](https://pjeeva140606.github.io/os-filesystem-simulator/)**

### 2. Local Browser (Offline)
1. Open the project folder:
   ```
   C:\Users\pjeev\.gemini\antigravity-ide\scratch\os-filesystem-simulator\
   ```
2. Double-click `index.html` (or right-click -> *Open with* Chrome, Edge, Firefox, or Safari).
3. **No server, node, or backend required!** It runs directly in any modern browser.

---

## 📚 Operating System Concepts & Viva Reference

### 1. Disk Blocks & Sectors
- In modern OS, physical disks are partitioned into fixed-size logical blocks (sectors/clusters).
- Here, the virtual disk has **64 blocks**, each holding **8 characters (bytes)**.
- If a file has 20 characters, it requires $\lceil 20 / 8 \rceil = 3$ blocks (Blocks 0 & 1 hold 8 chars, Block 2 holds 4 chars with 4 bytes internal fragmentation).

### 2. File Allocation Methods Comparison

| Feature | Contiguous Allocation | Linked Allocation | Indexed Allocation |
| :--- | :--- | :--- | :--- |
| **Directory Entry** | Start Block, Length | Start Block, End Block | Index Block Number |
| **External Fragmentation?** | **Yes** (severe drawback) | **No** (any free block used) | **No** (any free block used) |
| **Access Type** | Sequential + Direct (Random) | Sequential only | Sequential + Direct (Random) |
| **Pointer Overhead** | None (0 bytes) | 1 pointer per block | 1 full Index Block per file |
| **File Growth** | Difficult (needs free space ahead) | Very easy | Easy (up to index block capacity) |

---

## 🎤 Step-by-Step Viva Presentation Script

Use this exact script during your lab examination:

### Step 1: Explain the Virtual Disk & Contiguous Allocation
1. Open the simulator. Notice the **64-Block Grid** (all grey = FREE).
2. Click **"Load Demo Data"**.
3. Point to the grid:
   - `alpha.txt` took blocks 0–3.
   - `beta.txt` was created at blocks 4–7 and then deleted, leaving a **4-block hole**.
   - `gamma.txt` sits at blocks 8–11.
   - `delta.txt` was deleted, leaving a **4-block hole at 12–15**.
   - A nested directory `/root/documents/project_report.doc` exists.

### Step 2: Demonstrate External Fragmentation (The highlight!)
1. Click **"+ New File"**.
2. Name: `large_file.txt`.
3. Content: Type 48 characters (e.g. `123456781234567812345678123456781234567812345678`) &rarr; 6 blocks needed.
4. Click **"Save File"**.
5. **Show the examiner the Error Alert & Log:**
   > *"Notice how there are 52 free blocks in total on disk, but because no single contiguous run of 6 blocks is available in the early holes, contiguous allocation flags an **External Fragmentation** error!"*

### Step 3: Demonstrate Linked Allocation
1. Switch the allocation dropdown to **"Linked Allocation"** (confirms reformat).
2. Click **"+ New File"** and create `linked_test.txt` with 32 characters (4 blocks).
3. Click **"Read"** in the table:
   - Show the examiner the **visual traversal chain**:
     $$\text{Block \#0 } \xrightarrow{\text{next: 1}} \text{Block \#1 } \xrightarrow{\text{next: 2}} \text{Block \#2 } \xrightarrow{\text{next: 3}} \text{Block \#3 } (\text{EOF})$$
4. Hover over individual blocks in the grid to show the `nextBlock` pointers in the tooltip.

### Step 4: Demonstrate Indexed Allocation
1. Switch to **"Indexed Allocation"**.
2. Click **"+ New File"** &rarr; Name: `indexed_demo.txt`, Content: 24 chars (3 data blocks).
3. Observe that **4 blocks** were allocated: **1 Index Block** (with a dashed border and `[IDX]` tag) and **3 Data Blocks**.
4. Click **"Read"**:
   - Show how the Index Block contains direct pointers to each individual data block.

### Step 5: Directory Structure & Safety
1. Create a folder named `test_dir`.
2. Click **"Open"** to navigate inside (observe breadcrumbs updating to `/root/test_dir`).
3. Create a file inside `test_dir`.
4. Navigate back up to `/root` and try clicking the delete (`×`) button on `test_dir`.
5. Point out the OS safety rule: **"Directory is not empty! Delete its contents first."**

---

## 📂 File Structure

```
os-filesystem-simulator/
├── index.html       # Semantic layout, header controls, 64-block grid, modals & log
├── style.css        # Responsive dark/light theme, glassmorphism, animations
├── script.js        # FileSystem simulator, allocation algorithms, UI controller
└── README.md        # Documentation, theory & viva presentation guide
```

---

## 💻 Tech Stack
- **Pure HTML5**
- **Vanilla CSS3** (CSS Custom Properties, Flexbox, CSS Grid)
- **Vanilla JavaScript ES6+** (Classes, Maps, DOM manipulation)
- **Zero external dependencies, zero npm installs required**
