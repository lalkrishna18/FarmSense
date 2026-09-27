/**
 * FarmSense - Frontend Application Logic
 * Connected to Flask ML API
 */

// ============================================================
// MOCK MARKET DATA
// ============================================================

const mockMarketData = {
    "Rice": {
        price: 2450,
        trend: "+8.4%",
        direction: "up",
        history: [2200, 2250, 2300, 2380, 2400, 2450]
    },
    "Maize": {
        price: 1820,
        trend: "-2.1%",
        direction: "down",
        history: [1950, 1920, 1900, 1880, 1850, 1820]
    },
    "Wheat": {
        price: 2150,
        trend: "+0.5%",
        direction: "stable",
        history: [2140, 2145, 2150, 2148, 2152, 2150]
    },
    "Cotton": {
        price: 6200,
        trend: "+5.2%",
        direction: "up",
        history: [5800, 5900, 6000, 6050, 6100, 6200]
    }
};


// ============================================================
// MOCK PRICE ALERTS
// ============================================================

let mockAlerts = [
    {
        id: 1,
        crop: "Rice",
        currentPrice: 2450,
        targetPrice: 2800,
        status: "Waiting"
    },
    {
        id: 2,
        crop: "Wheat",
        currentPrice: 2150,
        targetPrice: 2100,
        status: "Reached"
    }
];


// ============================================================
// INITIAL FALLBACK RECOMMENDATIONS
// ============================================================
// These are displayed when the page initially loads.
// Once the user submits the Crop Advisor form,
// real ML recommendations replace these.

let mockRecommendations = [
    {
        crop: "Rice",
        score: 91,
        matchType: "Excellent match",
        reasons: [
            "Suitable rainfall (200mm)",
            "Optimal temperature (24.5°C)",
            "Ideal soil pH (6.5)"
        ],
        watchouts: [
            "Requires adequate standing water in early stages"
        ],
        soilReq: "Clayey loam with good water retention capacity"
    },
    {
        crop: "Maize",
        score: 82,
        matchType: "Good match",
        reasons: [
            "Favorable nitrogen levels",
            "Good temperature range"
        ],
        watchouts: [
            "Sensitive to waterlogging"
        ],
        soilReq: "Well-drained fertile loamy soil"
    }
];


// ============================================================
// GLOBAL CHART VARIABLES
// ============================================================

let dashboardChart = null;
let marketDetailChart = null;


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    handleHashNavigation();

    window.addEventListener("hashchange", handleHashNavigation);

    renderDashboardAlerts();

    renderRecommendations(mockRecommendations);

    renderAlertsList();

    initCharts();
});


// ============================================================
// SINGLE-PAGE VIEW NAVIGATION
// ============================================================

function navTo(viewId) {
    window.location.hash = viewId;
}


function handleHashNavigation() {

    const hash =
        window.location.hash.replace("#", "") || "dashboard";

    document
        .querySelectorAll(".view-section")
        .forEach(el => el.classList.remove("active"));

    document
        .querySelectorAll(".nav-btn")
        .forEach(el => el.classList.remove("active"));

    const targetView =
        document.getElementById(`view-${hash}`);

    const targetNav =
        document.getElementById(`nav-${hash}`);

    if (targetView) {
        targetView.classList.add("active");
    }

    if (targetNav) {
        targetNav.classList.add("active");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ============================================================
// RENDER CROP RECOMMENDATIONS
// ============================================================

function renderRecommendations(list) {

    const container =
        document.getElementById("recommendations-container");

    if (!container) {
        console.error(
            "recommendations-container element not found"
        );
        return;
    }

    container.innerHTML = "";

    if (!list || list.length === 0) {

        container.innerHTML = `
            <div class="card border-0 p-4 text-center">
                <i class="bi bi-inbox fs-1 text-muted"></i>
                <p class="text-muted mt-2">
                    No recommendations found.
                    Adjust inputs and submit.
                </p>
            </div>
        `;

        return;
    }

    list.forEach(item => {

        const reasons = Array.isArray(item.reasons)
            ? item.reasons
            : [];

        const cardHtml = `
            <div class="card border-0 shadow-sm p-4 crop-card bg-white">

                <div class="d-flex justify-content-between align-items-start mb-2">

                    <div>

                        <h4 class="fw-bold mb-0 text-success-dark">
                            ${item.crop}
                        </h4>

                        <span class="badge bg-success-subtle text-success mt-1">
                            ${item.matchType}
                        </span>

                    </div>

                    <div class="text-end">

                        <div class="display-6 fw-bold text-success-dark">
                            ${item.score}%
                        </div>

                        <div class="fs-7 text-muted">
                            Suitability
                        </div>

                    </div>

                </div>

                <div class="my-3">

                    <strong class="fs-7 text-muted text-uppercase">
                        Why it fits:
                    </strong>

                    <ul class="list-unstyled mb-0 mt-1 fs-7">

                        ${reasons.map(reason => `
                            <li class="text-dark">
                                <i class="bi bi-check-circle-fill text-success me-2"></i>
                                ${reason}
                            </li>
                        `).join("")}

                    </ul>

                </div>

                <div class="d-flex justify-content-end gap-2 border-top pt-3">

                    <button
                        class="btn btn-outline-success btn-sm fw-bold"
                        onclick="openCropModal('${item.crop}')">
                        View Details
                    </button>

                    <button
                        class="btn btn-success btn-sm fw-bold"
                        onclick="selectCropForAlert('${item.crop}')">
                        Track Price
                    </button>

                </div>

            </div>
        `;

        container.innerHTML += cardHtml;
    });
}


// ============================================================
// REAL ML CROP RECOMMENDATION
// ============================================================

async function handleRecommendationSubmit(e) {

    e.preventDefault();

    const loadingEl =
        document.getElementById("rec-loading");

    const resultsEl =
        document.getElementById("rec-results");

    const errorEl =
        document.getElementById("form-error-msg");


    // Clear previous error
    if (errorEl) {
        errorEl.classList.add("d-none");
        errorEl.textContent = "";
    }


    // Show loading
    if (resultsEl) {
        resultsEl.classList.add("d-none");
    }

    if (loadingEl) {
        loadingEl.classList.remove("d-none");
    }


    try {

        // ====================================================
        // READ FORM VALUES
        // ====================================================

        const N =
            parseFloat(
                document.getElementById("input-n").value
            );

        const P =
            parseFloat(
                document.getElementById("input-p").value
            );

        const K =
            parseFloat(
                document.getElementById("input-k").value
            );

        // IMPORTANT:
        // Your HTML uses input-temp
        const temperature =
            parseFloat(
                document.getElementById("input-temp").value
            );

        const humidity =
            parseFloat(
                document.getElementById("input-humidity").value
            );

        const rainfall =
            parseFloat(
                document.getElementById("input-rainfall").value
            );

        const ph =
            parseFloat(
                document.getElementById("input-ph").value
            );


        // ====================================================
        // VALIDATE VALUES
        // ====================================================

        const values = [
            N,
            P,
            K,
            temperature,
            humidity,
            rainfall,
            ph
        ];

        if (values.some(value => Number.isNaN(value))) {

            throw new Error(
                "Please enter valid values in all fields."
            );
        }


        // ====================================================
        // SEND REQUEST TO FLASK
        // ====================================================

        const response =
            await fetch("/api/recommend", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    N: N,

                    P: P,

                    K: K,

                    temperature: temperature,

                    humidity: humidity,

                    ph: ph,

                    rainfall: rainfall

                })

            });


        // ====================================================
        // READ SERVER RESPONSE
        // ====================================================

        const data =
            await response.json();


        // Backend error
        if (!response.ok) {

            throw new Error(
                data.error ||
                "Prediction failed."
            );
        }


        // Make sure recommendations exist
        if (
            !data.recommendations ||
            !Array.isArray(data.recommendations)
        ) {

            throw new Error(
                "Invalid recommendation response from server."
            );
        }


        // ====================================================
        // CONVERT ML RESULT TO UI FORMAT
        // ====================================================

        const recommendations =
            data.recommendations.map(item => {

                return {

                    crop: item.crop,

                    // Model gives 0.52
                    // UI displays 52%
                    score:
                        Math.round(
                            item.score * 100
                        ),

                    matchType:
                        getMatchType(
                            item.score
                        ),

                    reasons: [
                        "Recommended based on your soil and environmental conditions."
                    ],

                    watchouts: [
                        "Review local farming conditions before planting."
                    ],

                    soilReq:
                        "Recommendation generated by the FarmSense ML model."

                };

            });


        // ====================================================
        // SAVE REAL ML RESULTS
        // ====================================================

        mockRecommendations =
            recommendations;


        // ====================================================
        // HIDE LOADING
        // ====================================================

        if (loadingEl) {
            loadingEl.classList.add("d-none");
        }


        // ====================================================
        // SHOW RESULTS
        // ====================================================

        if (resultsEl) {
            resultsEl.classList.remove("d-none");
        }


        // ====================================================
        // RENDER RESULTS
        // ====================================================

        renderRecommendations(
            recommendations
        );


        // Update dashboard top crop if available
        updateDashboardTopCrop(
            recommendations
        );


    } catch (error) {

        console.error(
            "Recommendation error:",
            error
        );


        // Hide loading
        if (loadingEl) {
            loadingEl.classList.add("d-none");
        }


        // Show result area
        if (resultsEl) {
            resultsEl.classList.remove("d-none");
        }


        // Show error
        if (errorEl) {

            errorEl.textContent =
                error.message ||
                "Unable to get crop recommendations.";

            errorEl.classList.remove("d-none");

        } else {

            const container =
                document.getElementById(
                    "recommendations-container"
                );

            if (container) {

                container.innerHTML = `
                    <div class="alert alert-danger">

                        <i class="bi bi-exclamation-triangle-fill me-2"></i>

                        Unable to get crop recommendations.
                        Please check your inputs and try again.

                    </div>
                `;
            }
        }
    }
}


// ============================================================
// MATCH TYPE
// ============================================================

function getMatchType(score) {

    if (score >= 0.70) {
        return "Excellent match";
    }

    if (score >= 0.40) {
        return "Good match";
    }

    if (score >= 0.20) {
        return "Moderate match";
    }

    return "Low match";
}


// ============================================================
// UPDATE DASHBOARD TOP CROP
// ============================================================

function updateDashboardTopCrop(recommendations) {

    const element =
        document.getElementById(
            "dash-top-crop"
        );

    if (
        element &&
        recommendations &&
        recommendations.length > 0
    ) {

        element.innerText =
            recommendations[0].crop;
    }
}


// ============================================================
// CROP DETAILS MODAL
// ============================================================

function openCropModal(cropName) {

    const item =
        mockRecommendations.find(
            r => r.crop === cropName
        ) ||
        mockRecommendations[0];


    if (!item) {
        return;
    }


    document.getElementById(
        "modalCropName"
    ).innerText =
        `${item.crop} Suitability Details`;


    document.getElementById(
        "modalCropBody"
    ).innerHTML = `

        <div class="alert alert-success d-flex align-items-center gap-3 mb-4">

            <div class="display-5 fw-bold">
                ${item.score}%
            </div>

            <div>

                <strong>
                    ${item.matchType} for your farm!
                </strong>

                <p class="mb-0 fs-7">
                    Recommendation generated from
                    the FarmSense model.
                </p>

            </div>

        </div>


        <h6 class="fw-bold">
            Why it fits:
        </h6>

        <ul class="mb-3 fs-7">

            ${
                (item.reasons || [])
                    .map(reason => `<li>${reason}</li>`)
                    .join("")
            }

        </ul>


        <h6 class="fw-bold">
            What to watch out for:
        </h6>

        <ul class="mb-3 fs-7 text-danger">

            ${
                (item.watchouts || [])
                    .map(watchout => `<li>${watchout}</li>`)
                    .join("")
            }

        </ul>


        <h6 class="fw-bold">
            Soil Requirements:
        </h6>

        <p class="fs-7 text-muted">
            ${item.soilReq || "Not available"}
        </p>

    `;


    document.getElementById(
        "modalSetAlertBtn"
    ).onclick = () => {

        const modal =
            bootstrap.Modal.getInstance(
                document.getElementById(
                    "cropDetailModal"
                )
            );

        if (modal) {
            modal.hide();
        }

        selectCropForAlert(
            item.crop
        );

    };


    const modal =
        new bootstrap.Modal(
            document.getElementById(
                "cropDetailModal"
            )
        );

    modal.show();
}


// ============================================================
// MARKET VIEW
// ============================================================

async function updateMarketView() {

    const select = document.getElementById("market-crop-select");

    if (!select) {
        console.error("Market crop select not found");
        return;
    }

    const selectedCrop = select.value;

    console.log("Selected crop:", selectedCrop);

    try {

        const response = await fetch(
            `/api/market/${encodeURIComponent(selectedCrop)}`
        );

        if (!response.ok) {
            throw new Error(
                `Market API returned ${response.status}`
            );
        }

        const data = await response.json();

        console.log("Market data received:", data);

        // -----------------------------
        // UPDATE CURRENT PRICE
        // -----------------------------

        const priceElement =
            document.getElementById("market-current-price");

        if (priceElement) {
            priceElement.innerText =
                `₹${Number(data.price).toLocaleString("en-IN")}`;
        }


        // -----------------------------
        // UPDATE TREND
        // -----------------------------

        const badge =
            document.getElementById("market-trend-badge");

        if (badge) {

            const direction =
                data.direction === "down"
                    ? "down-right"
                    : "up-right";

            badge.innerHTML = `
                <i class="bi bi-arrow-${direction} me-1"></i>
                Price ${
                    data.direction === "down"
                        ? "Falling"
                        : "Rising"
                }
                (${data.trend})
            `;
        }


        // -----------------------------
        // UPDATE GRAPH
        // -----------------------------

        if (
            marketDetailChart &&
            Array.isArray(data.history)
        ) {

            marketDetailChart.data.datasets[0].data =
                data.history;

            marketDetailChart.data.datasets[0].label =
                `${data.crop} Price`;

            marketDetailChart.update();

            console.log(
                "Graph updated for:",
                data.crop
            );
        }
        else {

            console.error(
                "Chart not ready or history missing"
            );
        }

    }
    catch (error) {

        console.error(
            "Failed to load market data:",
            error
        );
    }
}


// ============================================================
// PRICE ALERT
// ============================================================

function selectCropForAlert(cropName) {

    navTo("alerts");


    const select =
        document.getElementById(
            "alert-crop-select"
        );


    if (select) {

        select.value =
            cropName;

        syncAlertFormPrice();

    }
}


function syncAlertFormPrice() {

    const selected =
        document.getElementById(
            "alert-crop-select"
        ).value;


    const data =
        mockMarketData[selected];


    if (!data) {
        return;
    }


    document.getElementById(
        "alert-current-price-display"
    ).value =
        `₹${data.price.toLocaleString()} / quintal`;
}


function handleAlertSubmit(e) {

    e.preventDefault();


    const crop =
        document.getElementById(
            "alert-crop-select"
        ).value;


    const targetPrice =
        parseInt(
            document.getElementById(
                "alert-target-price"
            ).value
        );


    const currentPrice =
        mockMarketData[crop].price;


    mockAlerts.push({

        id: Date.now(),

        crop,

        currentPrice,

        targetPrice,

        status:
            targetPrice <= currentPrice
                ? "Reached"
                : "Waiting"

    });


    renderAlertsList();

    renderDashboardAlerts();


    document.getElementById(
        "alert-form"
    ).reset();


    syncAlertFormPrice();
}


// ============================================================
// RENDER PRICE ALERTS
// ============================================================

function renderAlertsList() {

    const container =
        document.getElementById(
            "alerts-list-container"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    mockAlerts.forEach(a => {

        const isReached =
            a.status === "Reached";


        container.innerHTML += `

            <div class="card border-0 p-3 shadow-sm ${
                isReached
                    ? "border-start border-4 border-success"
                    : "bg-white"
            }">

                <div class="d-flex justify-content-between align-items-center">

                    <div>

                        <h5 class="fw-bold mb-1">
                            ${a.crop}
                        </h5>

                        <div class="fs-7 text-muted">

                            Current:
                            ₹${a.currentPrice}

                            |

                            Target:
                            <strong>
                                ₹${a.targetPrice}
                            </strong>

                        </div>

                    </div>


                    <span class="badge ${
                        isReached
                            ? "bg-success"
                            : "bg-warning text-dark"
                    } fs-7">

                        ${
                            isReached
                                ? "Target Reached!"
                                : "Waiting"
                        }

                    </span>

                </div>

            </div>

        `;
    });
}


// ============================================================
// DASHBOARD ALERTS
// ============================================================

function renderDashboardAlerts() {

    const list =
        document.getElementById(
            "dash-alerts-list"
        );


    const count =
        document.getElementById(
            "dash-active-alerts-count"
        );


    if (!list || !count) {
        return;
    }


    count.innerText =
        `${mockAlerts.length} Active`;


    list.innerHTML = "";


    mockAlerts
        .slice(0, 3)
        .forEach(a => {

            list.innerHTML += `

                <div class="p-2 border-bottom d-flex justify-content-between align-items-center">

                    <div>

                        <strong class="d-block fs-7">
                            ${a.crop}
                        </strong>

                        <span class="fs-7 text-muted">
                            Target: ₹${a.targetPrice}
                        </span>

                    </div>


                    <span class="badge bg-light text-dark border fs-7">
                        ${a.status}
                    </span>

                </div>

            `;
        });
}


// ============================================================
// CHART.JS SETUP
// ============================================================

function initCharts() {

    // Dashboard chart
    const ctxDash =
        document
            .getElementById(
                "dashboardChart"
            )
            ?.getContext("2d");


    if (ctxDash) {

        dashboardChart =
            new Chart(
                ctxDash,
                {

                    type: "line",

                    data: {

                        labels: [
                            "May",
                            "Jun",
                            "Jul",
                            "Aug",
                            "Sep",
                            "Oct"
                        ],

                        datasets: [{

                            label:
                                "Rice Price Index (₹/qtl)",

                            data: [
                                2200,
                                2250,
                                2300,
                                2380,
                                2400,
                                2450
                            ],

                            borderColor:
                                "#2D6A4F",

                            backgroundColor:
                                "rgba(45, 106, 79, 0.1)",

                            fill: true,

                            tension: 0.3

                        }]

                    },

                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }

                }
            );
    }


    // Market chart
    const ctxMarket =
        document
            .getElementById(
                "marketDetailChart"
            )
            ?.getContext("2d");


    if (ctxMarket) {

        marketDetailChart =
            new Chart(
                ctxMarket,
                {

                    type: "line",

                    data: {

                        labels: [
                            "May",
                            "Jun",
                            "Jul",
                            "Aug",
                            "Sep",
                            "Oct"
                        ],

                        datasets: [{

                            label:
                                "Historical Commodity Price",

                            data:
                                mockMarketData[
                                    "Rice"
                                ].history,

                            borderColor:
                                "#52B788",

                            backgroundColor:
                                "rgba(82, 183, 136, 0.15)",

                            fill: true,

                            tension: 0.3

                        }]

                    },

                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }

                }
            );
    }
}