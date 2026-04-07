// API Configuration
const API_BASE_URL = window.location.origin;
let authToken = localStorage.getItem("authToken");
let currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

// Store all vendors for searching
let allVendors = [];

console.log("Initial auth state:", {
  authToken: !!authToken,
  currentUser: !!currentUser,
});

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor - add auth token to all requests
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Response interceptor - handle 401 errors (token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, logout user
      logout();
      showToast("Session Expired", "Please login again", "error");
    }
    return Promise.reject(error);
  },
);

// Loading functions
function showLoading() {
  document.getElementById("loadingOverlay").classList.remove("hidden");
}

function hideLoading() {
  document.getElementById("loadingOverlay").classList.add("hidden");
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

function showUserLogin() {
  console.log("Switching to user login view");
  document.getElementById("roleSelection").classList.add("hidden");
  document.getElementById("userLoginForm").classList.remove("hidden");
  document.getElementById("adminLoginForm").classList.add("hidden");
}

function showAdminLogin() {
  console.log("Switching to admin login view");
  document.getElementById("roleSelection").classList.add("hidden");
  document.getElementById("adminLoginForm").classList.remove("hidden");
  document.getElementById("userLoginForm").classList.add("hidden");
}

function backToRoleSelection() {
  document.getElementById("adminLoginForm").classList.add("hidden");
  document.getElementById("userLoginForm").classList.add("hidden");
  document.getElementById("roleSelection").classList.remove("hidden");
}

// ADMIN LOGIN - CONNECTED TO YOUR DATABASE
async function handleAdminLogin(e) {
  e.preventDefault();
  e.stopPropagation();

  const emailInput = document.getElementById("adminEmail");
  const passwordInput = document.getElementById("adminPassword");

  if (!emailInput || !passwordInput) {
    console.error("ERROR: Could not find form inputs!");
    showToast("Error", "Form not properly loaded", "error");
    return;
  }

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  console.log("Admin login attempt:", { email: email });

  showLoading();

  try {
    // Call your backend API for authentication
    const response = await api.post("/login", {
      email,
      password,
    });

    const { token, user } = response.data;

    // Check if user is actually an admin
    if (user.role !== "admin") {
      throw new Error("Access denied. Admin privileges required.");
    }

    // Store token and user
    authToken = token;
    localStorage.setItem("authToken", token);
    localStorage.setItem("currentUser", JSON.stringify(user));
    currentUser = user;

    console.log("Admin login successful:", user);

    // Hide login screen and show app
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    await initializeApp();
    showToast("Welcome!", `${user.name} logged in successfully`, "success");
  } catch (error) {
    console.error("Admin login error:", error);

    let errorMessage = "Login failed. Please check your credentials.";
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.errors) {
      // Validation errors from express-validator
      errorMessage = error.response.data.errors.map((e) => e.msg).join(", ");
    } else if (error.response?.status === 401) {
      errorMessage = "Invalid email or password.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    showToast("Login Failed", errorMessage, "error");
  } finally {
    hideLoading();
  }
}

// USER LOGIN - CONNECTED TO YOUR DATABASE
async function handleUserLogin(e) {
  e.preventDefault();
  e.stopPropagation();

  const emailInput = document.getElementById("userEmail");
  const passwordInput = document.getElementById("userPassword");

  if (!emailInput || !passwordInput) {
    console.error("ERROR: Could not find form inputs!");
    showToast("Error", "Form not properly loaded", "error");
    return;
  }

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  console.log("User login attempt:", { email: email });

  showLoading();

  try {
    // Call your backend API for authentication
    const response = await api.post("/login", {
      email,
      password,
    });

    const { token, user } = response.data;

    // Store token and user
    authToken = token;
    localStorage.setItem("authToken", token);
    localStorage.setItem("currentUser", JSON.stringify(user));
    currentUser = user;

    console.log("User login successful:", user);

    // Hide login screen and show app
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    await initializeApp();
    showToast("Welcome!", `${user.name} logged in successfully`, "success");
  } catch (error) {
    console.error("User login error:", error);

    let errorMessage = "Login failed. Please check your credentials.";
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.errors) {
      errorMessage = error.response.data.errors.map((e) => e.msg).join(", ");
    } else if (error.response?.status === 401) {
      errorMessage = "Invalid email or password.";
    }

    showToast("Login Failed", errorMessage, "error");
  } finally {
    hideLoading();
  }
}

function logout() {
  console.log("Logging out...");

  authToken = null;
  currentUser = null;
  localStorage.removeItem("authToken");
  localStorage.removeItem("currentUser");

  document.getElementById("app").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
  backToRoleSelection();
}

// ============================================
// APP INITIALIZATION
// ============================================

async function initializeApp() {
  console.log("Initializing app...");

  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  // Update user info in sidebar
  document.getElementById("userAvatar").textContent = currentUser.name
    .charAt(0)
    .toUpperCase();
  document.getElementById("sidebarUserName").textContent = currentUser.name;
  document.getElementById("sidebarUserRole").textContent =
    currentUser.role === "admin" ? "Administrator" : "Staff Member";

  // Show admin-only elements
  if (currentUser.role === "admin") {
    document
      .querySelectorAll(".admin-only")
      .forEach((el) => el.classList.remove("hidden"));
  }

  // Load data
  try {
    await Promise.all([loadVendors(), loadOrders(), loadRequests()]);
    console.log("All data loaded");
  } catch (error) {
    console.error("Error loading initial data:", error);
    showToast("Warning", "Some data could not be loaded", "warning");
  }

  updateStats();
}

// ============================================
// VENDOR FUNCTIONS WITH SEARCH
// ============================================

async function loadVendors() {
  try {
    const response = await api.get("/loadvendors");
    allVendors = response.data; // Store for searching

    // Update vendor select dropdown
    const vendorSelect = document.getElementById("vendorSelect");
    vendorSelect.innerHTML = '<option value="">Select a vendor...</option>';
    allVendors.forEach((vendor) => {
      vendorSelect.innerHTML += `<option value="${vendor._id}">${vendor.name}</option>`;
    });

    // Render vendors list
    renderVendorsList(allVendors);

    // Reset search input and results count
    const searchInput = document.getElementById("vendorSearch");
    if (searchInput) {
      searchInput.value = "";
    }
    updateSearchResultCount(allVendors.length, "");
  } catch (error) {
    console.error("Error loading vendors:", error);
    showToast("Error", "Failed to load vendors", "error");
  }
}

function renderVendorsList(vendors) {
  const vendorsList = document.getElementById("vendorsList");
  if (!vendorsList) return;

  if (vendors.length === 0) {
    vendorsList.innerHTML =
      '<div class="text-center text-gray-500 py-8 col-span-full">No vendors found</div>';
    return;
  }

  vendorsList.innerHTML = vendors
    .map(
      (v) => `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:shadow-lg transition-all duration-200">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center mb-2">
              <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                <i class="fas fa-store text-blue-600 dark:text-blue-400"></i>
              </div>
              <div>
                <h4 class="font-bold text-gray-800 dark:text-white">${escapeHtml(v.name)}</h4>
                ${v.email ? `<p class="text-sm text-gray-500">${escapeHtml(v.email)}</p>` : ""}
              </div>
            </div>
            ${v.phone ? `<p class="text-xs text-gray-400 mt-1"><i class="fas fa-phone mr-1"></i>${escapeHtml(v.phone)}</p>` : ""}
            ${v.address ? `<p class="text-xs text-gray-400 mt-1"><i class="fas fa-map-marker-alt mr-1"></i>${escapeHtml(v.address)}</p>` : ""}
          </div>
          <button onclick="deleteVendor('${v._id}')" class="text-red-500 hover:text-red-700 p-2 transition-colors">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `,
    )
    .join("");
}

function searchVendors() {
  const searchTerm = document
    .getElementById("vendorSearch")
    .value.toLowerCase()
    .trim();
  const clearBtn = document.getElementById("clearSearchBtn");

  // Show/hide clear button
  if (clearBtn) {
    if (searchTerm) {
      clearBtn.classList.remove("hidden");
    } else {
      clearBtn.classList.add("hidden");
    }
  }

  // Filter vendors
  let filteredVendors = allVendors;

  if (searchTerm) {
    filteredVendors = allVendors.filter((vendor) => {
      return (
        vendor.name.toLowerCase().includes(searchTerm) ||
        (vendor.email && vendor.email.toLowerCase().includes(searchTerm)) ||
        (vendor.phone && vendor.phone.toLowerCase().includes(searchTerm)) ||
        (vendor.address && vendor.address.toLowerCase().includes(searchTerm))
      );
    });
  }

  // Update results count
  updateSearchResultCount(filteredVendors.length, searchTerm);

  // Render filtered results
  renderVendorsList(filteredVendors);
}

function clearVendorSearch() {
  const searchInput = document.getElementById("vendorSearch");
  if (searchInput) {
    searchInput.value = "";
  }
  const clearBtn = document.getElementById("clearSearchBtn");
  if (clearBtn) {
    clearBtn.classList.add("hidden");
  }
  searchVendors();
}

function updateSearchResultCount(count, searchTerm) {
  const resultCountDiv = document.getElementById("searchResultCount");
  if (resultCountDiv) {
    if (searchTerm) {
      resultCountDiv.innerHTML = `Found ${count} vendor${count !== 1 ? "s" : ""} matching "${escapeHtml(searchTerm)}"`;
    } else {
      resultCountDiv.innerHTML = `Total: ${allVendors.length} vendor${allVendors.length !== 1 ? "s" : ""}`;
    }
  }
}

async function saveVendor(e) {
  e.preventDefault();
  const vendorData = {
    name: document.getElementById("vendorName").value,
    email: document.getElementById("vendorEmail").value,
    phone: document.getElementById("vendorPhone").value,
    address: document.getElementById("vendorAddress").value,
  };

  showLoading();
  try {
    await api.post("/vendors", vendorData);
    await loadVendors();
    closeVendorModal();
    showToast("Success", "Vendor added successfully", "success");
  } catch (error) {
    showToast(
      "Error",
      error.response?.data?.message || "Failed to add vendor",
      "error",
    );
  } finally {
    hideLoading();
  }
}

async function deleteVendor(id) {
  if (!confirm("Delete this vendor?")) return;

  showLoading();
  try {
    await api.delete(`/api/vendors/${id}`);
    await loadVendors();
    showToast("Success", "Vendor deleted successfully", "success");
  } catch (error) {
    showToast(
      "Error",
      error.response?.data?.message || "Failed to delete vendor",
      "error",
    );
  } finally {
    hideLoading();
  }
}

// ============================================
// ORDER FUNCTIONS
// ============================================

function addProductItem() {
  const container = document.getElementById("productsContainer");
  if (container.children.length >= 20) {
    showToast("Limit Reached", "Maximum 20 products per order", "warning");
    return;
  }

  const newProduct = document.createElement("div");
  newProduct.className =
    "product-item bg-gray-50 dark:bg-gray-700 rounded-lg p-4 relative animate-slide-in";
  newProduct.innerHTML = `
    <div class="absolute top-2 right-2">
      <button type="button" onclick="removeProductItem(this)" class="text-red-500 hover:text-red-700">
        <i class="fas fa-trash"></i>
      </button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name *</label>
        <input type="text" class="product-name w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-600" placeholder="Enter product name" required>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Size *</label>
        <input type="text" class="product-size w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-600" placeholder="e.g., Large, XL, 24x36" required>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
        <div class="flex items-center gap-2">
          <button type="button" class="qty-minus px-3 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300">-</button>
          <input type="number" class="product-quantity w-full text-center px-3 py-2 border rounded-lg bg-white dark:bg-gray-600" value="1" min="1" required>
          <button type="button" class="qty-plus px-3 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300">+</button>
        </div>
      </div>
    </div>
  `;
  container.appendChild(newProduct);
  setupQuantityButtons(newProduct);
}

function removeProductItem(button) {
  const container = document.getElementById("productsContainer");
  if (container.children.length > 1) {
    button.closest(".product-item").remove();
  } else {
    showToast("Cannot Remove", "At least one product is required", "warning");
  }
}

function setupQuantityButtons(productItem) {
  const minusBtn = productItem.querySelector(".qty-minus");
  const plusBtn = productItem.querySelector(".qty-plus");
  const qtyInput = productItem.querySelector(".product-quantity");

  minusBtn.addEventListener("click", () => {
    let val = parseInt(qtyInput.value);
    if (val > 1) qtyInput.value = val - 1;
  });

  plusBtn.addEventListener("click", () => {
    let val = parseInt(qtyInput.value);
    qtyInput.value = val + 1;
  });
}

async function submitOrder(e) {
  e.preventDefault();

  const vendorId = document.getElementById("vendorSelect").value;
  console.log("=== FRONTEND ORDER SUBMISSION ===");
  console.log("Selected vendorId:", vendorId);
  console.log("vendorId type:", typeof vendorId);
  console.log("vendorId length:", vendorId?.length);

  if (!vendorId) {
    showToast("Error", "Please select a vendor", "error");
    return;
  }

  const products = [];
  const productItems = document.querySelectorAll(".product-item");

  for (let item of productItems) {
    const productName = item.querySelector(".product-name").value.trim();
    const size = item.querySelector(".product-size").value.trim();
    const quantity = parseInt(item.querySelector(".product-quantity").value);

    if (!productName || !size) {
      showToast("Error", "Please fill all product details", "error");
      return;
    }

    products.push({ productName, size, quantity });
  }

  const orderData = { vendorId, products };
  console.log("Order data being sent:", JSON.stringify(orderData, null, 2));

  showLoading();
  try {
    const response = await api.post("/create", orderData);
    console.log("Order creation response:", response.data);
    await loadOrders();

    // Reset form
    document.getElementById("orderForm").reset();
    const container = document.getElementById("productsContainer");
    while (container.children.length > 1) {
      container.removeChild(container.lastChild);
    }
    const firstProduct = container.firstElementChild;
    if (firstProduct) {
      firstProduct.querySelector(".product-name").value = "";
      firstProduct.querySelector(".product-size").value = "";
      firstProduct.querySelector(".product-quantity").value = "1";
    }

    showToast("Success", "Order placed successfully", "success");
  } catch (error) {
    console.error("Full error object:", error);
    console.error("Error response:", error.response);
    console.error("Error response data:", error.response?.data);
    showToast(
      "Error",
      error.response?.data?.message || "Failed to place order",
      "error",
    );
  } finally {
    hideLoading();
  }
}

async function loadOrders() {
  try {
    // Use /api/orders/getorder endpoint as per your backend
    const response = await api.get("/getorder");
    const orders = response.data;
    const statusFilter = document.getElementById("filterStatus")?.value || "";

    let filteredOrders = orders;
    if (statusFilter) {
      filteredOrders = orders.filter((o) => o.status === statusFilter);
    }

    renderOrdersList(filteredOrders);
    updateStats();
  } catch (error) {
    console.error("Error loading orders:", error);
    showToast("Error", "Failed to load orders", "error");
  }
}

function renderOrdersList(orders) {
  const ordersList = document.getElementById("ordersList");
  if (!ordersList) return;

  if (orders.length === 0) {
    ordersList.innerHTML =
      '<div class="text-center py-12 text-gray-500">No orders found</div>';
    return;
  }

  ordersList.innerHTML = orders
    .map(
      (order) => `
    <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-5">
      <div class="flex justify-between items-start mb-3">
        <div>
          <span class="text-xs font-mono text-gray-500">${order._id}</span>
          <span class="ml-2 status-badge status-${order.status}">${order.status}</span>
        </div>
        <div class="flex gap-2">
          ${
            currentUser.role === "admin"
              ? `
            <button onclick="updateOrderStatus('${order._id}', 'Processing')" class="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs">Process</button>
            <button onclick="updateOrderStatus('${order._id}', 'Processed')" class="px-2 py-1 bg-green-100 text-green-600 rounded text-xs">Complete</button>
            <button onclick="deleteOrder('${order._id}')" class="px-2 py-1 bg-red-100 text-red-600 rounded text-xs">Delete</button>
          `
              : ""
          }
        </div>
      </div>
      <div class="font-medium text-gray-800 dark:text-white">Vendor: ${order.vendorName || "Unknown"}</div>
      <div class="mt-2 space-y-2">
        ${order.products
          .map(
            (p) => `
          <div class="text-sm pl-4 border-l-2 border-blue-300">
            <span class="font-medium">${escapeHtml(p.productName)}</span> - ${p.size} x ${p.quantity}
          </div>
        `,
          )
          .join("")}
      </div>
      <div class="text-xs text-gray-500 mt-2">${new Date(order.createdAt).toLocaleDateString()} • by ${order.userName || "Unknown"}</div>
    </div>
  `,
    )
    .join("");
}

async function updateOrderStatus(orderId, status) {
  showLoading();
  try {
    await api.put(`/${orderId}`, { status });
    await loadOrders();
    showToast("Success", `Order status updated to ${status}`, "success");
  } catch (error) {
    showToast(
      "Error",
      error.response?.data?.message || "Failed to update order",
      "error",
    );
  } finally {
    hideLoading();
  }
}

async function deleteOrder(orderId) {
  if (!confirm("Delete this order?")) return;

  showLoading();
  try {
    await api.delete(`/${orderId}`);
    await loadOrders();
    showToast("Success", "Order deleted successfully", "success");
  } catch (error) {
    showToast(
      "Error",
      error.response?.data?.message || "Failed to delete order",
      "error",
    );
  } finally {
    hideLoading();
  }
}

// ============================================
// REQUEST FUNCTIONS
// ============================================

async function submitAdminRequest(e) {
  e.preventDefault();
  const requestData = {
    type: "admin",
    title: document.getElementById("adminReqTitle").value,
    description: document.getElementById("adminReqDesc").value,
  };

  showLoading();
  try {
    await api.post("/requests", requestData);
    await loadRequests();
    document.getElementById("adminRequestForm").reset();
    showToast("Success", "Admin request submitted successfully", "success");
  } catch (error) {
    console.error("Submit error:", error.response?.data);
    showToast(
      "Error",
      error.response?.data?.message || "Failed to submit request",
      "error",
    );
  } finally {
    hideLoading();
  }
}

async function submitHRRequest(e) {
  e.preventDefault();
  const requestData = {
    type: "hr",
    requestType: document.getElementById("hrReqType").value,
    description: document.getElementById("hrReqDesc").value,
  };

  showLoading();
  try {
    await api.post("/requests", requestData);
    await loadRequests();
    document.getElementById("hrRequestForm").reset();
    showToast("Success", "HR request submitted successfully", "success");
  } catch (error) {
    console.error("Submit error:", error.response?.data);
    showToast(
      "Error",
      error.response?.data?.message || "Failed to submit request",
      "error",
    );
  } finally {
    hideLoading();
  }
}

async function loadRequests() {
  try {
    const response = await api.get("/getrequests");
    const requests = response.data;
    renderRequests(requests);
  } catch (error) {
    console.error("Error loading requests:", error);
    showToast("Error", "Failed to load requests", "error");
  }
}

function renderRequests(requests) {
  const adminRequests = requests.filter((r) => r.type === "admin");
  const hrRequests = requests.filter((r) => r.type === "hr");

  document.getElementById("adminReqCount").textContent = adminRequests.length;
  document.getElementById("hrReqCount").textContent = hrRequests.length;

  const adminContainer = document.getElementById("adminRequestsList");
  if (adminContainer) {
    adminContainer.innerHTML =
      adminRequests
        .map(
          (req) => `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-medium text-gray-800 dark:text-white">${escapeHtml(req.title)}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">${escapeHtml(req.description)}</div>
          </div>
          <span class="status-badge status-${req.status}">${req.status}</span>
        </div>
        <div class="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>${req.userName || "Unknown"}</span>
          ${
            currentUser.role === "admin" && req.status === "Pending"
              ? `
            <div class="flex gap-2">
              <button onclick="updateRequestStatus('${req._id}', 'Processing')" class="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs">Process</button>
              <button onclick="updateRequestStatus('${req._id}', 'Completed')" class="px-2 py-1 bg-green-100 text-green-600 rounded text-xs">Complete</button>
            </div>
          `
              : currentUser.role === "admin" && req.status === "Processing"
                ? `
            <div class="flex gap-2">
              <button onclick="updateRequestStatus('${req._id}', 'Completed')" class="px-2 py-1 bg-green-100 text-green-600 rounded text-xs">Complete</button>
            </div>
          `
                : ""
          }
        </div>
      </div>
    `,
        )
        .join("") ||
      '<div class="text-center text-gray-500 py-4">No admin requests</div>';
  }

  const hrContainer = document.getElementById("hrRequestsList");
  if (hrContainer) {
    hrContainer.innerHTML =
      hrRequests
        .map(
          (req) => `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-medium text-gray-800 dark:text-white">${escapeHtml(req.requestType)}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">${escapeHtml(req.description)}</div>
          </div>
          <span class="status-badge status-${req.status}">${req.status}</span>
        </div>
        <div class="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>${req.userName || "Unknown"}</span>
          ${
            currentUser.role === "admin" && req.status === "Pending"
              ? `
            <div class="flex gap-2">
              <button onclick="updateRequestStatus('${req._id}', 'Processing')" class="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs">Process</button>
              <button onclick="updateRequestStatus('${req._id}', 'Completed')" class="px-2 py-1 bg-green-100 text-green-600 rounded text-xs">Complete</button>
            </div>
          `
              : currentUser.role === "admin" && req.status === "Processing"
                ? `
            <div class="flex gap-2">
              <button onclick="updateRequestStatus('${req._id}', 'Completed')" class="px-2 py-1 bg-green-100 text-green-600 rounded text-xs">Complete</button>
            </div>
          `
                : ""
          }
        </div>
      </div>
    `,
        )
        .join("") ||
      '<div class="text-center text-gray-500 py-4">No HR requests</div>';
  }
}

async function updateRequestStatus(requestId, status) {
  console.log("Updating request:", requestId, "to status:", status);

  showLoading();
  try {
    await api.put(`/request/${requestId}`, { status });
    await loadRequests();
    showToast("Success", `Request status updated to ${status}`, "success");
  } catch (error) {
    console.error("Update error:", error.response?.data);
    showToast(
      "Error",
      error.response?.data?.message || "Failed to update request",
      "error",
    );
  } finally {
    hideLoading();
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function updateStats() {
  api
    .get("/api/orders/getorder")
    .then((response) => {
      const orders = response.data;
      document.getElementById("statTotalOrders").textContent = orders.length;
      document.getElementById("statPendingOrders").textContent = orders.filter(
        (o) => o.status === "Pending",
      ).length;
      document.getElementById("statProcessed").textContent = orders.filter(
        (o) => o.status === "Processed",
      ).length;
    })
    .catch(() => {
      document.getElementById("statTotalOrders").textContent = "0";
      document.getElementById("statPendingOrders").textContent = "0";
      document.getElementById("statProcessed").textContent = "0";
    });

  api
    .get("/api/requests")
    .then((response) => {
      const requests = response.data;
      document.getElementById("statRequests").textContent = requests.filter(
        (r) => r.status === "Pending",
      ).length;
    })
    .catch(() => {
      document.getElementById("statRequests").textContent = "0";
    });
}

function exportOrders() {
  api.get("/api/orders/getorder").then((response) => {
    const orders = response.data;
    const csv = [["Order ID", "Vendor", "Products", "Status", "Date", "User"]];
    orders.forEach((o) => {
      const products = o.products
        .map((p) => `${p.productName}(${p.size}x${p.quantity})`)
        .join("; ");
      csv.push([
        o._id,
        o.vendorName || "Unknown",
        products,
        o.status,
        new Date(o.createdAt).toLocaleDateString(),
        o.userName || "Unknown",
      ]);
    });
    const blob = new Blob([csv.map((row) => row.join(",")).join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function printOrders() {
  api.get("/api/orders/getorder").then((response) => {
    const orders = response.data;
    const printContent = document.getElementById("printContent");
    document.getElementById("printDate").textContent =
      new Date().toLocaleDateString();

    const grouped = orders.reduce((acc, o) => {
      const vendor = o.vendorName || "Unknown";
      if (!acc[vendor]) acc[vendor] = [];
      acc[vendor].push(o);
      return acc;
    }, {});

    printContent.innerHTML = Object.entries(grouped)
      .map(
        ([vendor, orders]) => `
      <div class="mb-8">
        <h2 class="text-xl font-bold mb-4">${escapeHtml(vendor)}</h2>
        ${orders
          .map(
            (order) => `
          <div class="mb-4 border p-4">
            <div><strong>Order ID:</strong> ${order._id}</div>
            <div><strong>Status:</strong> ${order.status}</div>
            <div><strong>Products:</strong></div>
            <ul class="ml-4">
              ${order.products.map((p) => `<li>${escapeHtml(p.productName)} - ${p.size} x ${p.quantity}</li>`).join("")}
            </ul>
            <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</div>
          </div>
        `,
          )
          .join("")}
      </div>
    `,
      )
      .join("");
    window.print();
  });
}

function openVendorModal() {
  document.getElementById("vendorModal").classList.remove("hidden");
}

function closeVendorModal() {
  document.getElementById("vendorModal").classList.add("hidden");
  document.getElementById("vendorName").value = "";
  document.getElementById("vendorEmail").value = "";
  document.getElementById("vendorPhone").value = "";
  document.getElementById("vendorAddress").value = "";
}

function switchView(view) {
  document
    .querySelectorAll(".view-section")
    .forEach((el) => el.classList.add("hidden"));
  document.getElementById(`view-${view}`).classList.remove("hidden");

  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.remove(
      "bg-gray-100",
      "dark:bg-gray-800",
      "text-gray-900",
      "dark:text-white",
    );
  });
  const activeNav = document.getElementById(`nav-${view}`);
  if (activeNav) {
    activeNav.classList.add(
      "bg-gray-100",
      "dark:bg-gray-800",
      "text-gray-900",
      "dark:text-white",
    );
  }

  const titles = {
    dashboard: "Dashboard",
    orders: "Orders",
    requests: "Requests",
    vendors: "Vendors",
    settings: "Settings",
  };
  document.getElementById("pageTitle").textContent =
    titles[view] || "Dashboard";
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("-translate-x-full");
}

function toggleDarkMode() {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem(
    "darkMode",
    document.documentElement.classList.contains("dark"),
  );
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showToast(title, message, type) {
  const toast = document.getElementById("toast");
  document.getElementById("toastTitle").textContent = title;
  document.getElementById("toastMessage").textContent = message;

  const icon = document.getElementById("toastIcon");
  icon.className = "fas text-xl";
  if (type === "success")
    icon.classList.add("fa-check-circle", "text-emerald-400");
  else if (type === "error")
    icon.classList.add("fa-times-circle", "text-red-400");
  else if (type === "warning")
    icon.classList.add("fa-exclamation-triangle", "text-amber-400");
  else icon.classList.add("fa-info-circle", "text-blue-400");

  toast.classList.remove("translate-y-20", "opacity-0");
  setTimeout(() => toast.classList.add("translate-y-20", "opacity-0"), 3000);
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded");

  if (localStorage.getItem("darkMode") === "true") {
    document.documentElement.classList.add("dark");
  }

  // Check for existing session
  if (authToken && currentUser) {
    console.log("Restoring existing session...");
    initializeApp();
  } else {
    console.log("No existing session, showing login");
  }

  // Setup quantity buttons for first product item
  const firstProduct = document.querySelector(".product-item");
  if (firstProduct) {
    setupQuantityButtons(firstProduct);
  }
});
