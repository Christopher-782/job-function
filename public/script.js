// API Configuration
const API_BASE_URL = window.location.origin;
let authToken = localStorage.getItem("authToken");
let currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
let allVendors = [];
let allOrders = [];
let allRequests = [];
let charts = {};
let productCounter = 0;

// Unified Status System
const WORKFLOW_STATUS = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
};

const STATUS_WORKFLOW = {
  [WORKFLOW_STATUS.PENDING]: [
    WORKFLOW_STATUS.PROCESSING,
    WORKFLOW_STATUS.COMPLETED,
  ],
  [WORKFLOW_STATUS.PROCESSING]: [WORKFLOW_STATUS.COMPLETED],
  [WORKFLOW_STATUS.COMPLETED]: [],
};

const statusColors = {
  [WORKFLOW_STATUS.PENDING]:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  [WORKFLOW_STATUS.PROCESSING]:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  [WORKFLOW_STATUS.COMPLETED]:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
      showToast("Session Expired", "Please login again", "error");
    }
    return Promise.reject(error);
  },
);

// ============================================
// UI FUNCTIONS
// ============================================

function showLoading() {
  document.getElementById("loadingOverlay").classList.remove("hidden");
}
function hideLoading() {
  document.getElementById("loadingOverlay").classList.add("hidden");
}

function showToast(title, message, type = "info") {
  const toast = document.getElementById("toast");
  const icon = document.getElementById("toastIcon");
  const icons = {
    success: "fa-check-circle text-emerald-500",
    error: "fa-times-circle text-red-500",
    warning: "fa-exclamation-triangle text-amber-500",
    info: "fa-info-circle text-orange-500",
  };
  icon.className = `fas ${icons[type] || icons.info} text-xl mt-0.5`;
  document.getElementById("toastTitle").textContent = title;
  document.getElementById("toastMessage").textContent = message;
  toast.classList.remove("translate-y-20", "opacity-0");
  setTimeout(() => hideToast(), 5000);
}

function hideToast() {
  document.getElementById("toast").classList.add("translate-y-20", "opacity-0");
}

function toggleDarkMode() {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem(
    "darkMode",
    document.documentElement.classList.contains("dark"),
  );
}
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  sidebar.classList.toggle("-translate-x-full");

  if (overlay) {
    overlay.classList.toggle("hidden");
  }
}

function switchView(view) {
  document
    .querySelectorAll(".view-section")
    .forEach((el) => el.classList.add("hidden"));
  document.getElementById(`view-${view}`).classList.remove("hidden");

  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.remove(
      "bg-emerald-100",
      "dark:bg-emerald-900/30",
      "text-emerald-600",
      "dark:text-emerald-400",
    );
    el.classList.add("text-gray-600", "dark:text-gray-300");
  });

  const activeNav = document.getElementById(`nav-${view}`);
  if (activeNav) {
    activeNav.classList.remove("text-gray-600", "dark:text-gray-300");
    activeNav.classList.add(
      "bg-emerald-100",
      "dark:bg-emerald-900/30",
      "text-emerald-600",
      "dark:text-emerald-400",
    );
  }

  const titles = {
    dashboard: { title: "Overview", crumb: "Home / Dashboard" },
    orders: { title: "Order Management", crumb: "Procurement / Orders" },
    approvals: { title: "Pending Approvals", crumb: "Management / Approvals" },
    requests: { title: "Requests", crumb: "Operations / Requests" },
    vendors: { title: "Vendor Directory", crumb: "Procurement / Vendors" },
    analytics: { title: "Analytics & Reports", crumb: "Insights / Analytics" },
    settings: { title: "System Settings", crumb: "Admin / Settings" },
  };

  const viewInfo = titles[view] || titles.dashboard;
  document.getElementById("pageTitle").textContent = viewInfo.title;
  document.getElementById("breadcrumb").textContent = viewInfo.crumb;

  if (view === "analytics") loadCharts();
  if (view === "approvals") loadApprovals();
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("-translate-x-full");
}

// ============================================
// AUTHENTICATION
// ============================================

function showUserLogin() {
  document.getElementById("roleSelection").classList.add("hidden");
  document.getElementById("userLoginForm").classList.remove("hidden");
  document.getElementById("adminLoginForm").classList.add("hidden");
}

function showAdminLogin() {
  document.getElementById("roleSelection").classList.add("hidden");
  document.getElementById("adminLoginForm").classList.remove("hidden");
  document.getElementById("userLoginForm").classList.add("hidden");
}

function backToRoleSelection() {
  document.getElementById("adminLoginForm").classList.add("hidden");
  document.getElementById("userLoginForm").classList.add("hidden");
  document.getElementById("roleSelection").classList.remove("hidden");
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document
    .getElementById("adminEmail")
    .value.trim()
    .toLowerCase();
  const password = document.getElementById("adminPassword").value;
  showLoading();
  try {
    const response = await api.post("/login", { email, password });
    const { token, user } = response.data;
    authToken = token;
    currentUser = user;
    localStorage.setItem("authToken", token);
    localStorage.setItem("currentUser", JSON.stringify(user));
    await initializeApp();
    showToast("Welcome Back", `${user.name} logged in successfully`, "success");
  } catch (error) {
    showToast(
      "Login Failed",
      error.response?.data?.message || "Invalid credentials",
      "error",
    );
  } finally {
    hideLoading();
  }
}

async function handleUserLogin(e) {
  e.preventDefault();
  const email = document.getElementById("userEmail").value.trim().toLowerCase();
  const password = document.getElementById("userPassword").value;
  showLoading();
  try {
    const response = await api.post("/login", { email, password });
    const { token, user } = response.data;
    authToken = token;
    currentUser = user;
    localStorage.setItem("authToken", token);
    localStorage.setItem("currentUser", JSON.stringify(user));
    await initializeApp();
    showToast("Welcome", `${user.name} logged in successfully`, "success");
  } catch (error) {
    showToast("Login Failed", "Invalid credentials", "error");
  } finally {
    hideLoading();
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem("authToken");
  localStorage.removeItem("currentUser");
  document.getElementById("app").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
  backToRoleSelection();
}

// ============================================
// INITIALIZATION
// ============================================

async function initializeApp() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("userAvatar").textContent = currentUser.name
    .charAt(0)
    .toUpperCase();
  document.getElementById("sidebarUserName").textContent = currentUser.name;
  document.getElementById("welcomeName").textContent =
    currentUser.name.split(" ")[0];

  const roleDisplay = {
    admin: "Administrator",
    procurement_officer: "Procurement Officer",
    hr_officer: "HR Officer",
    staff: "Staff Member",
    user: "Staff Member",
  };
  document.getElementById("sidebarUserRole").textContent =
    roleDisplay[currentUser.role] || "Staff";

  if (
    ["admin", "procurement_officer", "hr_officer"].includes(currentUser.role)
  ) {
    document
      .querySelectorAll(".admin-only")
      .forEach((el) => el.classList.remove("hidden"));
  }
  document.getElementById("nav-vendors").classList.remove("hidden");

  updateDateTime();
  setInterval(updateDateTime, 60000);
  initializeOrderForm();

  try {
    await Promise.all([
      loadVendors(),
      loadOrders(),
      loadRequests(),
      updateStats(),
    ]);
  } catch (error) {
    showToast("Warning", "Some features may be limited", "warning");
  }
}

function updateDateTime() {
  const now = new Date();
  document.getElementById("currentDate").textContent = now.toLocaleDateString(
    "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  );
  document.getElementById("currentTime").textContent = now.toLocaleTimeString(
    "en-US",
    { hour: "2-digit", minute: "2-digit" },
  );
}

// ============================================
// ORDER FORM LOGIC
// ============================================

function initializeOrderForm() {
  const container = document.getElementById("productsContainer");
  if (!container) return;
  container.innerHTML = "";
  productCounter = 0;
  addProductItem();
}

function addProductItem() {
  const container = document.getElementById("productsContainer");
  const currentProducts = container.children.length;
  if (currentProducts >= 30) {
    showToast("Limit Reached", "Maximum 30 products allowed", "warning");
    return;
  }
  productCounter++;
  const productId = `product-${productCounter}`;
  const productDiv = document.createElement("div");
  productDiv.className =
    "product-item bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 relative animate-slide-in";
  productDiv.id = productId;
  productDiv.innerHTML = `
    <div class="flex justify-between items-center mb-3">
      <span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2"><i class="fas fa-box"></i> Product #${currentProducts + 1}</span>
      <button type="button" onclick="removeProductItem('${productId}')" class="text-red-500 hover:text-red-700 p-1.5 rounded transition-all ${currentProducts === 0 ? "hidden" : ""}"><i class="fas fa-trash-alt"></i></button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
      <div class="md:col-span-5">
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Product Name <span class="text-red-500">*</span></label>
        <input type="text" class="product-name w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="Enter product name" required onchange="updateTotalItems()" />
      </div>
      <div class="md:col-span-3">
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Size <span class="text-red-500">*</span></label>
        <input type="text" class="product-size w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="e.g., L, XL" required />
      </div>
      <div class="md:col-span-4">
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Quantity <span class="text-red-500">*</span></label>
        <div class="flex items-center gap-2">
          <button type="button" onclick="adjustQuantity('${productId}', -1)" class="qty-minus w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center"><i class="fas fa-minus text-xs"></i></button>
          <input type="number" class="product-quantity w-full text-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500" value="1" min="1" max="9999" required onchange="updateTotalItems()" />
          <button type="button" onclick="adjustQuantity('${productId}', 1)" class="qty-plus w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center"><i class="fas fa-plus text-xs"></i></button>
        </div>
      </div>
    </div>`;
  container.appendChild(productDiv);
  updateProductCount();
  updateTotalItems();
  productDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function removeProductItem(productId) {
  const container = document.getElementById("productsContainer");
  const productDiv = document.getElementById(productId);
  if (container.children.length <= 1) {
    showToast("Cannot Remove", "At least one product is required", "warning");
    return;
  }
  productDiv.style.opacity = "0";
  productDiv.style.transform = "translateX(-20px)";
  setTimeout(() => {
    productDiv.remove();
    renumberProducts();
    updateProductCount();
    updateTotalItems();
  }, 200);
}

function renumberProducts() {
  const container = document.getElementById("productsContainer");
  const products = container.querySelectorAll(".product-item");
  products.forEach((prod, index) => {
    prod.querySelector("span").innerHTML =
      `<i class="fas fa-box"></i> Product #${index + 1}`;
    const removeBtn = prod.querySelector(
      "button[onclick^='removeProductItem']",
    );
    if (removeBtn) removeBtn.classList.toggle("hidden", products.length === 1);
  });
}

function adjustQuantity(productId, change) {
  const qtyInput = document
    .getElementById(productId)
    .querySelector(".product-quantity");
  let newVal = parseInt(qtyInput.value) + change;
  if (newVal < 1) newVal = 1;
  if (newVal > 9999) newVal = 9999;
  qtyInput.value = newVal;
  updateTotalItems();
}

function updateProductCount() {
  const count = document.getElementById("productsContainer").children.length;
  document.getElementById("productCount").textContent =
    `${count} of 30 products`;
  const addBtn = document.getElementById("addProductBtn");
  const warning = document.getElementById("productLimitWarning");
  if (count >= 30) {
    addBtn.disabled = true;
    addBtn.classList.add("opacity-50");
    warning.classList.remove("hidden");
  } else {
    addBtn.disabled = false;
    addBtn.classList.remove("opacity-50");
    warning.classList.add("hidden");
  }
}

function updateTotalItems() {
  let total = 0;
  document.querySelectorAll(".product-quantity").forEach((qty) => {
    total += parseInt(qty.value) || 0;
  });
  document.getElementById("totalItems").textContent = total;
}

async function submitOrder(e) {
  e.preventDefault();
  const vendorId = document.getElementById("vendorSelect").value;
  if (!vendorId) {
    showToast("Error", "Please select a vendor", "error");
    return;
  }
  const products = [];
  for (let item of document.querySelectorAll(".product-item")) {
    const productName = item.querySelector(".product-name").value.trim();
    const size = item.querySelector(".product-size").value.trim();
    const quantity = parseInt(item.querySelector(".product-quantity").value);
    if (!productName || !size) {
      showToast("Error", "Please fill all details", "error");
      return;
    }
    products.push({ productName, size, quantity });
  }
  const orderData = {
    vendorId,
    products,
    totalItems: products.reduce((sum, p) => sum + p.quantity, 0),
  };
  showLoading();
  try {
    await api.post("/create", orderData);
    await loadOrders();
    clearOrderForm();
    showToast(
      "Success",
      `Order placed with ${products.length} products`,
      "success",
    );
  } catch (error) {
    showToast(
      "Error",
      error.response?.data?.message || "Failed to place order",
      "error",
    );
  } finally {
    hideLoading();
  }
}

function clearOrderForm() {
  if (!confirm("Clear all products and start over?")) return;
  document.getElementById("productsContainer").innerHTML = "";
  productCounter = 0;
  document.getElementById("vendorSelect").value = "";
  addProductItem();
}

// ============================================
// VENDORS
// ============================================

async function loadVendors() {
  try {
    const response = await api.get("/loadvendors");
    allVendors = response.data;
    const selects = ["vendorSelect", "quickVendor"];
    selects.forEach((id) => {
      const select = document.getElementById(id);
      if (select) {
        const val = select.value;
        select.innerHTML = '<option value="">Select a vendor...</option>';
        allVendors.forEach(
          (v) =>
            (select.innerHTML += `<option value="${v._id}">${v.name}</option>`),
        );
        select.value = val;
      }
    });
    renderVendors(allVendors);
  } catch (error) {
    showToast("Error", "Failed to load vendors", "error");
  }
}

function renderVendors(vendors) {
  const container = document.getElementById("vendorsGrid");
  if (!container) return;
  if (vendors.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center py-12"><p class="text-gray-500">No vendors found</p></div>`;
    return;
  }
  container.innerHTML = vendors
    .map(
      (v) => `
    <div class="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-4 border border-white/50 dark:border-gray-700/50 hover:border-emerald-400 transition-all hover:shadow-lg">
      <div class="flex justify-between items-start mb-3">
        <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"><i class="fas fa-store text-white text-xl"></i></div>
        ${currentUser.role !== "user" && currentUser.role !== "staff" ? `<button onclick="deleteVendor('${v._id}')" class="text-gray-400 hover:text-red-500"><i class="fas fa-trash"></i></button>` : ""}
      </div>
      <h4 class="font-bold text-gray-800 dark:text-white mb-1">${v.name}</h4>
      ${v.email ? `<p class="text-sm text-gray-500 dark:text-gray-400 mb-1"><i class="fas fa-envelope mr-2 text-orange-500"></i>${v.email}</p>` : ""}
      ${v.phone ? `<p class="text-sm text-gray-500 dark:text-gray-400 mb-1"><i class="fas fa-phone mr-2 text-emerald-500"></i>${v.phone}</p>` : ""}
      ${v.address ? `<p class="text-sm text-gray-500 dark:text-gray-400 mb-1"><i class="fas fa-map-marker-alt mr-2 text-orange-500"></i>${v.address}</p>` : ""}
      <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <span class="text-xs text-gray-400">${v.orderCount || 0} orders</span>
        <div class="flex gap-1">${[1, 2, 3, 4, 5].map((i) => `<i class="fas fa-star text-xs ${i <= (v.rating || 0) ? "text-orange-400" : "text-gray-300"}"></i>`).join("")}</div>
      </div>
    </div>`,
    )
    .join("");
}

async function saveVendor(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById("vendorName").value,
    email: document.getElementById("vendorEmail").value,
    phone: document.getElementById("vendorPhone").value,
    address: document.getElementById("vendorAddress").value,
  };
  showLoading();
  try {
    await api.post("/vendors", data);
    await loadVendors();
    closeVendorModal();
    showToast("Success", "Vendor added", "success");
  } catch (error) {
    showToast("Error", error.response?.data?.message || "Failed", "error");
  } finally {
    hideLoading();
  }
}

async function deleteVendor(id) {
  if (!confirm("Delete this vendor?")) return;
  showLoading();
  try {
    await api.delete(`/vendors/${id}`);
    await loadVendors();
    showToast("Success", "Deleted", "success");
  } catch (error) {
    showToast("Error", "Failed", "error");
  } finally {
    hideLoading();
  }
}

function openVendorModal() {
  document.getElementById("vendorModal").classList.remove("hidden");
}
function closeVendorModal() {
  document.getElementById("vendorModal").classList.add("hidden");
}

// ============================================
// ORDERS
// ============================================

async function loadOrders() {
  try {
    const response = await api.get("/getorder");
    allOrders = response.data;
    renderOrdersTable(allOrders);
    updateStats();
  } catch (error) {
    showToast("Error", "Failed to load orders", "error");
  }
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById("ordersTableBody");
  const emptyState = document.getElementById("ordersEmptyState");
  const statusFilter = document.getElementById("filterStatus")?.value;
  const searchTerm = document
    .getElementById("orderSearch")
    ?.value.toLowerCase();

  let filtered = orders;
  if (statusFilter)
    filtered = filtered.filter((o) => o.status === statusFilter);
  if (searchTerm) {
    filtered = filtered.filter(
      (o) =>
        o._id.toLowerCase().includes(searchTerm) ||
        o.vendorName?.toLowerCase().includes(searchTerm) ||
        o.products.some((p) =>
          p.productName.toLowerCase().includes(searchTerm),
        ),
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  tbody.innerHTML = filtered
    .map((order) => {
      const totalQty = order.products.reduce((sum, p) => sum + p.quantity, 0);
      const productSummary = order.products
        .map((p) => `${p.productName} (${p.size})`)
        .join(", ");
      let actionButtons = "";
      if (currentUser.role !== "user" && currentUser.role !== "staff") {
        if (order.status === "Pending")
          actionButtons = `<button onclick="event.stopPropagation(); updateOrderStatus('${order._id}', 'Processing')" class="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"><i class="fas fa-play"></i></button>`;
        else if (order.status === "Processing")
          actionButtons = `<button onclick="event.stopPropagation(); updateOrderStatus('${order._id}', 'Completed')" class="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded transition-colors"><i class="fas fa-check-double"></i></button>`;
      }
      return `
      <tr onclick="openOrderDetail('${order._id}')" class="cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors border-b border-gray-100 dark:border-gray-700">
        <td class="font-mono text-xs text-gray-500 py-4">${order._id.slice(-8).toUpperCase()}</td>
        <td class="font-medium text-gray-800 dark:text-gray-200 py-4">${escapeHtml(order.vendorName || "Unknown")}</td>
        <td class="max-w-xs truncate text-gray-600 dark:text-gray-400 py-4" title="${escapeHtml(productSummary)}">${escapeHtml(productSummary)}</td>
        <td class="text-center py-4"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">${totalQty}</span></td>
        <td class="py-4"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || statusColors["Pending"]}">${order.status}</span></td>
        <td class="text-gray-500 text-sm py-4">${new Date(order.createdAt).toLocaleDateString()}</td>
        <td onclick="event.stopPropagation()">
          <div class="flex gap-1">${actionButtons}<button onclick="event.stopPropagation(); openOrderDetail('${order._id}')" class="p-1.5 text-gray-500 hover:text-emerald-600 rounded transition-colors"><i class="fas fa-eye"></i></button></div>
        </td>
      </tr>`;
    })
    .join("");
}

async function updateOrderStatus(orderId, status) {
  if (!confirm(`Update order status to "${status}"?`)) return;
  showLoading();
  try {
    await api.put(`/${orderId}`, { status });
    await loadOrders();
    showToast("Status Updated", `Order marked as ${status}`, "success");
  } catch (error) {
    showToast("Error", error.response?.data?.message || "Failed", "error");
  } finally {
    hideLoading();
  }
}

function openOrderDetail(orderId) {
  const order = allOrders.find((o) => o._id === orderId);
  if (!order) return;
  const modal = document.getElementById("orderDetailModal");
  const content = document.getElementById("orderDetailContent");
  const totalQty = order.products.reduce((sum, p) => sum + p.quantity, 0);
  const productsHtml = order.products
    .map(
      (p, i) => `
    <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
      <div class="flex items-center gap-3"><div class="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 font-semibold text-sm">${i + 1}</div><div><p class="font-medium text-gray-800 dark:text-white">${escapeHtml(p.productName)}</p><p class="text-sm text-gray-500 dark:text-gray-400">Size: ${escapeHtml(p.size)}</p></div></div>
      <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">Qty: ${p.quantity}</span>
    </div>`,
    )
    .join("");

  let statusActions = "";
  if (currentUser.role !== "user" && currentUser.role !== "staff") {
    if (order.status === "Pending")
      statusActions = `<button onclick="updateOrderStatus('${order._id}', 'Processing'); closeOrderDetail();" class="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium">Start Processing</button>`;
    else if (order.status === "Processing")
      statusActions = `<button onclick="updateOrderStatus('${order._id}', 'Completed'); closeOrderDetail();" class="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-medium">Mark Completed</button>`;
  }

  content.innerHTML = `
    <div class="space-y-6">
      <div class="border-b border-gray-200 dark:border-gray-700 pb-4"><div class="flex justify-between items-start mb-2"><div><h3 class="text-2xl font-bold text-gray-800 dark:text-white">Order Details</h3><p class="text-sm text-gray-500 font-mono mt-1">ID: ${order._id.toUpperCase()}</p></div><span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}">${order.status}</span></div><div class="grid grid-cols-2 gap-4 mt-4 text-sm"><div><span class="text-gray-500">Vendor:</span> <span class="ml-2 font-medium text-gray-800 dark:text-white">${escapeHtml(order.vendorName || "Unknown")}</span></div><div><span class="text-gray-500">Date:</span> <span class="ml-2 font-medium text-gray-800 dark:text-white">${new Date(order.createdAt).toLocaleDateString()}</span></div><div><span class="text-gray-500">Total Items:</span> <span class="ml-2 font-medium text-emerald-600">${totalQty}</span></div></div></div>
      <div><h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">Products (${order.products.length})</h4><div class="space-y-2 max-h-64 overflow-y-auto pr-2">${productsHtml}</div></div>
      ${statusActions ? `<div class="border-t border-gray-200 dark:border-gray-700 pt-4">${statusActions}</div>` : ""}
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4 flex gap-3">
        <button onclick="downloadOrderAsWord('${order._id}')" class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg"><i class="fas fa-file-word"></i> Word</button>
        <button onclick="downloadOrderAsPDF('${order._id}')" class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg"><i class="fas fa-file-pdf"></i> PDF</button>
      </div>
    </div>`;
  modal.classList.remove("hidden");
}

function closeOrderDetail() {
  document.getElementById("orderDetailModal").classList.add("hidden");
}

async function downloadOrderAsWord(orderId) {
  const order = allOrders.find((o) => o._id === orderId);
  if (!order) return;
  const totalQty = order.products.reduce((sum, p) => sum + p.quantity, 0);
  const productsRows = order.products
    .map(
      (p, i) =>
        `<tr><td style="border:1px solid #ddd;padding:8px;text-align:center;">${i + 1}</td><td style="border:1px solid #ddd;padding:8px;">${escapeHtml(p.productName)}</td><td style="border:1px solid #ddd;padding:8px;text-align:center;">${escapeHtml(p.size)}</td><td style="border:1px solid #ddd;padding:8px;text-align:center;">${p.quantity}</td></tr>`,
    )
    .join("");
  const wordContent = `<html><head><meta charset="utf-8"></head><body><h1 style="color:#059669">ORDER DETAILS</h1><p>ID: ${order._id.toUpperCase()}</p><p>Vendor: ${escapeHtml(order.vendorName)}</p><p>Status: ${order.status}</p><table><thead><tr><th>#</th><th>Product</th><th>Size</th><th>Qty</th></tr></thead><tbody>${productsRows}</tbody></table><p>Total Quantity: ${totalQty}</p></body></html>`;
  const blob = new Blob(["\ufeff", wordContent], {
    type: "application/msword",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Order_${order._id.slice(-8)}.doc`;
  a.click();
}

function downloadOrderAsPDF(orderId) {
  const order = allOrders.find((o) => o._id === orderId);
  if (!order) return;
  const printWindow = window.open("", "_blank");
  const totalQty = order.products.reduce((sum, p) => sum + p.quantity, 0);
  const productsRows = order.products
    .map(
      (p, i) =>
        `<tr><td style="border:1px solid #ddd;padding:12px;text-align:center;">${i + 1}</td><td style="border:1px solid #ddd;padding:12px;">${escapeHtml(p.productName)}</td><td style="border:1px solid #ddd;padding:12px;text-align:center;">${escapeHtml(p.size)}</td><td style="border:1px solid #ddd;padding:12px;text-align:center;font-weight:bold;">${p.quantity}</td></tr>`,
    )
    .join("");
  printWindow.document.write(
    `<html><head><style>body{font-family:Arial;padding:20px;} table{width:100%;border-collapse:collapse;} th{background:#059669;color:white;padding:12px;} td{border:1px solid #ddd;padding:12px;}</style></head><body><h1 style="color:#059669">ORDER DETAILS</h1><p>ID: ${order._id.toUpperCase()}</p><p>Vendor: ${escapeHtml(order.vendorName)}</p><p>Status: ${order.status}</p><table><thead><tr><th>#</th><th>Product</th><th>Size</th><th>Qty</th></tr></thead><tbody>${productsRows}</tbody></table><p>Total Quantity: ${totalQty}</p><script>window.onload=()=>window.print();<\/script></body></html>`,
  );
  printWindow.document.close();
}

// ============================================
// REQUESTS
// ============================================

async function loadRequests() {
  try {
    const response = await api.get("/getrequests");
    allRequests = response.data || [];
    const isAdminOrOfficer = [
      "admin",
      "procurement_officer",
      "hr_officer",
    ].includes(currentUser?.role);
    const requestsToShow = isAdminOrOfficer
      ? allRequests
      : allRequests.filter(
          (r) =>
            r.createdBy === currentUser?._id ||
            r.userName === currentUser?.name,
        );
    renderMyRequests(requestsToShow);

    const myPendingCount = allRequests.filter(
      (r) =>
        (r.createdBy === currentUser?._id ||
          r.userName === currentUser?.name) &&
        (r.status === "Pending" || r.status === "Processing"),
    ).length;
    const badge = document.getElementById("requestsBadge");
    if (badge) {
      if (myPendingCount > 0) {
        badge.textContent = myPendingCount;
        badge.classList.remove("hidden");
      } else badge.classList.add("hidden");
    }

    if (isAdminOrOfficer) await loadApprovals();
  } catch (error) {
    console.error(error);
  }
}

function renderMyRequests(requests) {
  const container = document.getElementById("myRequestsList");
  if (requests.length === 0) {
    container.innerHTML =
      '<p class="text-gray-500 text-center py-8">No requests yet</p>';
    return;
  }
  container.innerHTML = requests
    .map(
      (r) => `
    <div class="flex items-center justify-between p-4 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-white/50 dark:border-gray-700/50">
      <div class="flex-1"><div class="flex items-center gap-2 mb-1"><span class="font-medium text-gray-800 dark:text-white">${r.title || r.requestType}</span><span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] || statusColors.Pending}">${r.status}</span></div><p class="text-sm text-gray-500 dark:text-gray-400">${r.description.substring(0, 60)}...</p></div>
      <span class="text-xs text-gray-400">${new Date(r.createdAt).toLocaleDateString()}</span>
    </div>`,
    )
    .join("");
}

async function submitAdminRequest(e) {
  e.preventDefault();
  const data = {
    type: "admin",
    title: document.getElementById("adminReqTitle").value,
    description: document.getElementById("adminReqDesc").value,
    priority: document.getElementById("adminReqPriority").value,
  };
  showLoading();
  try {
    await api.post("/requests", data);
    await loadRequests();
    document.getElementById("adminRequestForm").reset();
    showToast("Submitted", "Admin request sent", "success");
  } catch (error) {
    showToast("Error", "Failed", "error");
  } finally {
    hideLoading();
  }
}

async function submitHRRequest(e) {
  e.preventDefault();
  const type = document.getElementById("hrReqType").value;
  const data = {
    type: "hr",
    requestType: type,
    description: document.getElementById("hrReqDesc").value,
    priority: "Medium",
  };
  if (type === "Leave") {
    data.leaveStart = document.getElementById("leaveStart")?.value;
    data.leaveEnd = document.getElementById("leaveEnd")?.value;
    data.leaveType = document.getElementById("leaveType")?.value;
  }
  showLoading();
  try {
    await api.post("/requests", data);
    await loadRequests();
    document.getElementById("hrRequestForm").reset();
    showToast("Submitted", "HR request sent", "success");
  } catch (error) {
    showToast("Error", "Failed", "error");
  } finally {
    hideLoading();
  }
}

async function updateRequestStatus(requestId, status) {
  if (!confirm(`Update request status to "${status}"?`)) return;
  showLoading();
  try {
    await api.put(`/request/${requestId}`, { status });
    await Promise.all([loadRequests(), loadApprovals(), updateStats()]);
    showToast("Updated", `Request marked as ${status}`, "success");
  } catch (error) {
    showToast("Error", "Failed", "error");
  } finally {
    hideLoading();
  }
}

function openRequestDetail(requestId) {
  const request = allRequests.find((r) => r._id === requestId);
  if (!request) return;
  const modal = document.getElementById("requestDetailModal");
  const content = document.getElementById("requestDetailContent");
  let statusActions = "";
  if (currentUser.role !== "user" && currentUser.role !== "staff") {
    if (request.status === "Pending")
      statusActions = `<button onclick="updateRequestStatus('${request._id}', 'Processing'); closeRequestDetail();" class="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium">Start Processing</button>`;
    else if (request.status === "Processing")
      statusActions = `<button onclick="updateRequestStatus('${request._id}', 'Completed'); closeRequestDetail();" class="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-medium">Mark Complete</button>`;
  }
  content.innerHTML = `
    <div class="space-y-6">
      <div class="border-b border-gray-200 dark:border-gray-700 pb-4"><div class="flex justify-between items-start mb-2"><div><h3 class="text-2xl font-bold text-gray-800 dark:text-white">Request Details</h3><p class="text-sm text-gray-500 font-mono mt-1">ID: ${request._id.toUpperCase()}</p></div><span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[request.status]}">${request.status}</span></div><div class="grid grid-cols-2 gap-4 mt-4 text-sm"><div><span class="text-gray-500">Type:</span> <span class="ml-2 font-medium capitalize">${request.type}</span></div><div><span class="text-gray-500">Category:</span> <span class="ml-2 font-medium">${escapeHtml(request.requestType || request.title)}</span></div><div><span class="text-gray-500">Requested By:</span> <span class="ml-2 font-medium">${escapeHtml(request.userName)}</span></div><div><span class="text-gray-500">Date:</span> <span class="ml-2 font-medium">${new Date(request.createdAt).toLocaleDateString()}</span></div></div></div>
      <div><h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">Description</h4><div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"><p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">${escapeHtml(request.description)}</p></div></div>
      ${statusActions ? `<div class="border-t border-gray-200 dark:border-gray-700 pt-4">${statusActions}</div>` : ""}
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4"><button onclick="downloadRequestAsWord('${request._id}')" class="w-full py-2 bg-blue-600 text-white rounded-lg font-medium">Download Word</button></div>
    </div>`;
  modal.classList.remove("hidden");
}

function closeRequestDetail() {
  document.getElementById("requestDetailModal").classList.add("hidden");
}

async function downloadRequestAsWord(requestId) {
  const request = allRequests.find((r) => r._id === requestId);
  if (!request) return;
  const wordContent = `<html><body><h1>REQUEST DETAILS</h1><p>ID: ${request._id.toUpperCase()}</p><p>Type: ${request.type}</p><p>Category: ${escapeHtml(request.requestType || request.title)}</p><p>Requested By: ${escapeHtml(request.userName)}</p><p>Status: ${request.status}</p><hr><p>Description: ${escapeHtml(request.description)}</p></body></html>`;
  const blob = new Blob(["\ufeff", wordContent], {
    type: "application/msword",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Request_${request._id.slice(-8)}.doc`;
  a.click();
}

// ============================================
// APPROVALS
// ============================================

async function loadApprovals() {
  showLoading();
  try {
    const ordersRes = await api.get("/getorder");
    const pendingOrders =
      ordersRes.data?.filter((o) => o.status === "Pending") || [];
    const requestsRes = await api.get("/getrequests");
    const allRequestsData = requestsRes.data || [];
    allRequests = allRequestsData;

    const pendingAdminRequests = allRequestsData.filter(
      (r) =>
        r.type === "admin" &&
        (r.status === "Pending" || r.status === "Processing"),
    );
    const pendingHRRequests = allRequestsData.filter(
      (r) =>
        r.type === "hr" &&
        (r.status === "Pending" || r.status === "Processing"),
    );

    document.getElementById("procurementApprovalCount").textContent =
      pendingOrders.length;
    document.getElementById("adminApprovalCount").textContent =
      pendingAdminRequests.length;
    document.getElementById("hrApprovalCount").textContent =
      pendingHRRequests.length;

    const totalPending =
      pendingOrders.length +
      pendingAdminRequests.length +
      pendingHRRequests.length;
    const badge = document.getElementById("approvalsBadge");
    if (badge) {
      if (totalPending > 0) {
        badge.textContent = totalPending;
        badge.classList.remove("hidden");
      } else badge.classList.add("hidden");
    }

    renderProcurementApprovals(pendingOrders);
    renderAdminApprovals(pendingAdminRequests);
    renderHRApprovals(pendingHRRequests);
  } catch (error) {
    console.error(error);
  } finally {
    hideLoading();
  }
}

function renderProcurementApprovals(orders) {
  const container = document.getElementById("procurementApprovalsList");
  if (!container) return;
  if (orders.length === 0) {
    container.innerHTML =
      '<p class="text-gray-500 text-center py-8">No orders pending</p>';
    return;
  }
  container.innerHTML = orders
    .map(
      (o) => `
    <div class="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4 border border-white/50 dark:border-gray-700/50">
      <div class="flex justify-between items-start mb-2"><div><p class="font-semibold text-gray-800 dark:text-white">${escapeHtml(o.vendorName)}</p><p class="text-xs text-gray-500 font-mono">${o._id.slice(-8).toUpperCase()}</p></div><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">${o.status}</span></div>
      <div class="text-sm text-gray-600 dark:text-gray-300 mb-3">${o.products.map((p) => `${p.productName} x${p.quantity}`).join(", ")}</div>
      <div class="flex gap-2"><button onclick="updateOrderStatus('${o._id}', 'Processing')" class="flex-1 py-1.5 bg-blue-600 text-white rounded text-sm font-medium">Start</button><button onclick="openOrderDetail('${o._id}')" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm font-medium">View</button></div>
    </div>`,
    )
    .join("");
}

function renderAdminApprovals(requests) {
  const container = document.getElementById("adminApprovalsList");
  if (!container) return;
  if (requests.length === 0) {
    container.innerHTML =
      '<p class="text-gray-500 text-center py-8">No requests</p>';
    return;
  }
  container.innerHTML = requests
    .map(
      (r) => `
    <div class="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4 border border-white/50 dark:border-gray-700/50 hover:shadow-md transition-all">
      <div class="flex justify-between items-start mb-2"><div><p class="font-semibold text-gray-800 dark:text-white">${escapeHtml(r.title || r.requestType)}</p><p class="text-xs text-gray-500">${escapeHtml(r.userName)} • ${new Date(r.createdAt).toLocaleDateString()}</p></div><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status]}">${r.status}</span></div>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">${escapeHtml(r.description)}</p>
      <div class="flex gap-2"><button onclick="updateRequestStatus('${r._id}', '${r.status === "Pending" ? "Processing" : "Completed"}')" class="flex-1 py-1.5 ${r.status === "Pending" ? "bg-blue-600" : "bg-emerald-600"} text-white rounded text-sm font-medium">${r.status === "Pending" ? "Start" : "Complete"}</button><button onclick="openRequestDetail('${r._id}')" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm font-medium">View</button></div>
    </div>`,
    )
    .join("");
}

function renderHRApprovals(requests) {
  const container = document.getElementById("hrApprovalsList");
  if (!container) return;
  if (requests.length === 0) {
    container.innerHTML =
      '<p class="text-gray-500 text-center py-8">No HR requests</p>';
    return;
  }
  container.innerHTML = requests
    .map(
      (r) => `
    <div class="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4 border border-white/50 dark:border-gray-700/50">
      <div class="flex justify-between items-start mb-2"><div><p class="font-semibold text-gray-800 dark:text-white">${escapeHtml(r.requestType)}</p><p class="text-xs text-gray-500">${escapeHtml(r.userName)} • ${new Date(r.createdAt).toLocaleDateString()}</p></div><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status]}">${r.status}</span></div>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">${escapeHtml(r.description)}</p>
      <div class="flex gap-2"><button onclick="updateRequestStatus('${r._id}', '${r.status === "Pending" ? "Processing" : "Completed"}')" class="flex-1 py-1.5 ${r.status === "Pending" ? "bg-blue-600" : "bg-emerald-600"} text-white rounded text-sm font-medium">${r.status === "Pending" ? "Start" : "Complete"}</button><button onclick="openRequestDetail('${r._id}')" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm font-medium">View</button></div>
    </div>`,
    )
    .join("");
}

// ============================================
// ANALYTICS ENGINE (THE FIX)
// ============================================

function loadCharts() {
  const ctx1 = document.getElementById("ordersChart");
  const ctx2 = document.getElementById("spendingChart");
  const ctx3 = document.getElementById("vendorChart");
  const ctx4 = document.getElementById("requestTypeChart");

  if (!ctx1 || !ctx2 || !ctx3 || !ctx4) return;

  // 1. Destroy existing charts to prevent ghosting/overlap
  if (charts.orders) charts.orders.destroy();
  if (charts.spending) charts.spending.destroy();
  if (charts.vendor) charts.vendor.destroy();
  if (charts.requestType) charts.requestType.destroy();

  if (allOrders.length === 0 && allRequests.length === 0) return;

  // --- CHART 1: ORDER STATUS (Doughnut) ---
  const statusCounts = allOrders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  charts.orders = new Chart(ctx1, {
    type: "doughnut",
    data: {
      labels: Object.keys(statusCounts),
      datasets: [
        {
          data: Object.values(statusCounts),
          backgroundColor: ["#f59e0b", "#3b82f6", "#10b981", "#ef4444"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
    },
  });

  // --- CHART 2: MONTHLY TRENDS (Line) ---
  const monthlyData = getMonthlyOrderData();
  charts.spending = new Chart(ctx2, {
    type: "line",
    data: {
      labels: monthlyData.labels,
      datasets: [
        {
          label: "Orders",
          data: monthlyData.data,
          borderColor: "#f97316",
          backgroundColor: "rgba(249, 115, 22, 0.1)",
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });

  // --- CHART 3: VENDOR PERFORMANCE (Bar) ---
  const vendorCounts = allOrders.reduce((acc, o) => {
    const name = o.vendorName || "Unknown";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const sortedVendors = Object.entries(vendorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  charts.vendor = new Chart(ctx3, {
    type: "bar",
    data: {
      labels: sortedVendors.map((v) => v[0]),
      datasets: [
        {
          label: "Orders",
          data: sortedVendors.map((v) => v[1]),
          backgroundColor: "#10b981",
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: "y" },
  });

  // --- CHART 4: REQUEST TYPES (Pie) ---
  const reqTypeCounts = allRequests.reduce((acc, r) => {
    const type = r.type || "General";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  charts.requestType = new Chart(ctx4, {
    type: "pie",
    data: {
      labels: Object.keys(reqTypeCounts),
      datasets: [
        {
          data: Object.values(reqTypeCounts),
          backgroundColor: [
            "#6366f1",
            "#ec4899",
            "#f59e0b",
            "#10b981",
            "#8b5cf6",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
    },
  });

  updateMetricCards();
}

function getMonthlyOrderData() {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const currentYear = new Date().getFullYear();
  const labels = [];
  const data = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthIdx = d.getMonth();
    const yearIdx = d.getFullYear();

    labels.push(months[monthIdx]);
    const count = allOrders.filter((o) => {
      const oDate = new Date(o.createdAt);
      return oDate.getMonth() === monthIdx && oDate.getFullYear() === yearIdx;
    }).length;
    data.push(count);
  }
  return { labels, data };
}

function updateMetricCards() {
  document.getElementById("metricTotalOrders").textContent = allOrders.length;
  const activeReqs = allRequests.filter(
    (r) => r.status === "Pending" || r.status === "Processing",
  ).length;
  document.getElementById("metricActiveRequests").textContent = activeReqs;

  const vendorCounts = allOrders.reduce((acc, o) => {
    const name = o.vendorName || "Unknown";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const topVendor = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1])[0];
  document.getElementById("metricTopVendor").textContent = topVendor
    ? topVendor[0]
    : "N/A";

  const completed = allOrders.filter((o) => o.status === "Completed").length;
  const rate =
    allOrders.length > 0 ? Math.round((completed / allOrders.length) * 100) : 0;
  document.getElementById("metricCompletionRate").textContent = `${rate}%`;
}

// ============================================
// STATISTICS
// ============================================

async function updateStats() {
  try {
    const [ordersRes, requestsRes] = await Promise.all([
      api.get("/getorder"),
      api.get("/getrequests"),
    ]);
    allOrders = ordersRes.data || [];
    allRequests = requestsRes.data || [];

    const totalOrders = allOrders.length;
    const pendingApproval = allOrders.filter(
      (o) => o.status === "Pending",
    ).length;
    const completed = allOrders.filter((o) => o.status === "Completed").length;
    const pendingRequests = allRequests.filter(
      (r) => r.status === "Pending",
    ).length;

    animateValue("statTotalOrders", 0, totalOrders, 1000);
    animateValue("statPendingApproval", 0, pendingApproval, 1000);
    animateValue("statProcessed", 0, completed, 1000);

    const totalItems = allOrders.reduce(
      (sum, o) => sum + o.products.reduce((pSum, p) => pSum + p.quantity, 0),
      0,
    );
    const budgetPercent = Math.min((totalItems / 1000) * 100, 100);
    document.getElementById("statBudgetUsed").textContent =
      budgetPercent.toFixed(0) + "%";

    const ordersBadge = document.getElementById("ordersBadge");
    if (ordersBadge) {
      if (pendingApproval > 0) {
        ordersBadge.textContent = pendingApproval;
        ordersBadge.classList.remove("hidden");
      } else ordersBadge.classList.add("hidden");
    }

    const requestsBadge = document.getElementById("requestsBadge");
    if (requestsBadge) {
      if (pendingRequests > 0) {
        requestsBadge.textContent = pendingRequests;
        requestsBadge.classList.remove("hidden");
      } else requestsBadge.classList.add("hidden");
    }

    const currentView = document.querySelector(
      ".view-section:not(.hidden)",
    )?.id;
    if (currentView === "view-analytics") loadCharts();
  } catch (error) {
    console.error(error);
  }
}

function animateValue(id, start, end, duration) {
  const obj = document.getElementById(id);
  if (!obj) return;
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerHTML = Math.floor(progress * (end - start) + start);
    if (progress < 1) window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}

// ============================================
// UTILITY & REST
// ============================================

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// (Include remaining existing functions: searchOrders, exportOrders, openOrderDetail, closeOrderDetail, downloadOrderAsWord, downloadOrderAsPDF, renderProcurementApprovals, renderAdminApprovals, renderHRApprovals, loadRequests, renderMyRequests, toggleHRFields, submitAdminRequest, submitHRRequest, updateRequestStatus, loadVendors, renderVendors, searchVendors, saveVendor, deleteVendor, openVendorModal, closeVendorModal, submitQuickOrder, initializeOrderForm, addProductItem, removeProductItem, renumberProducts, adjustQuantity, updateProductCount, updateTotalItems, clearOrderForm, submitOrder, toggleDarkMode, switchView, logout, handleAdminLogin, handleUserLogin, initializeApp, updateDateTime, showUserLogin, showAdminLogin, backToRoleSelection, showLoading, hideLoading, showToast, hideToast, toggleSidebar)
// Note: I omitted the duplicate implementation of the standard logic to keep this response readable, but ensure all functions from your original file remain present.

// ============================================
// FINAL INIT
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("darkMode") === "true")
    document.documentElement.classList.add("dark");
  if (authToken && currentUser) initializeApp();
});
