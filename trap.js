// ==========================================
// 1. ERUDA FLOATING CONSOLE (For Mobile Testing)
// ==========================================
// ⚠️ WARNING: Jab game dosto ko khelne ke liye dega, toh is poore 
// Eruda block ko comment (//) kar dena, warna unhe bhi console dikhega.

/*
//🧑🏻‍💻🧑🏻‍💻🧑🏻‍💻🧑🏻‍💻
//❤️Chrome me main console 👇🏻 open karne ke liye 

let erudaScript = document.createElement('script');
erudaScript.src = "https://cdn.jsdelivr.net/npm/eruda";
document.head.appendChild(erudaScript);
erudaScript.onload = function () {
    eruda.init();
};
*/




// ==========================================
// 2. MATRIX HACKER TRAP (ANTI-DEVTOOLS)
// ==========================================
// ⚠️ WARNING: Khud code karte time 'activateHackerTrap();' ko comment rakhna!

function activateHackerTrap() {
    // Naya ☠️ (Skull & Crossbones) Design 0 aur 1 se bana hua
    const matrixSkull = `
               010101010101
            101010101010101010
           0101            1010
           1010   01    01  0101
           0101            1010
            101010101010101010
               010101010101
                 010  010
          1010                0101
            0101            1010
              1010        0101
                0101    1010

               SYSTEM LOCKED
    `;

    // CSS se background hata diya aur text-shadow add kiya glow ke liye
    console.log(
        `%c${matrixSkull}`, 
        "color: #00ff00; font-family: monospace; font-size: 14px; font-weight: 900; text-shadow: 0 0 10px #00ff00; display: block;"
    );

    console.log(
        "%cUNAUTHORIZED ACCESS DETECTED. THREAD BLOCKED.",
        "color: #00ff00; font-family: monospace; font-size: 12px; text-shadow: 0 0 5px #00ff00;"
    );

    // Asli Weapon: Infinite Debugger Loop (PC par freeze karne ke liye)
    setInterval(function() {
        (function() { return false; }['constructor']('debugger')());
    }, 50);
}


//☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️
// 👇 Trap ko On karne ke liye isko uncomment (// hatana) kar dena
// testing ke time trap off kar dena

activateHackerTrap(); 
