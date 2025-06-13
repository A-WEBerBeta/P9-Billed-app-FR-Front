/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom";
import "@testing-library/jest-dom";
import NewBill from "../containers/NewBill.js";
import NewBillUI from "../views/NewBillUI.js";

import store from "../app/Store.js";

jest.mock("../app/Store.js", () => ({
  __esModule: true,
  default: {
    bills: jest.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() =>
    JSON.stringify({ email: "employee@test.com", type: "Employee" })
  ),
};

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then the NewBill form should be rendered", () => {
      // Given
      const html = NewBillUI();
      document.body.innerHTML = html;

      // Then
      expect(screen.getByTestId("form-new-bill")).toBeTruthy();
      expect(screen.getByTestId("expense-type")).toBeTruthy();
      expect(screen.getByTestId("file")).toBeTruthy();
    });

    test("When I upload a valid image file, it should update fileUrl and fileName", async () => {
      // Given
      const html = NewBillUI();
      document.body.innerHTML = html;

      Object.defineProperty(window, "localStorage", {
        value: mockLocalStorage,
      });

      const onNavigate = jest.fn();
      const store = {
        bills: () => ({
          create: jest.fn().mockResolvedValue({
            fileUrl: "https://localhost/image.jpg",
            key: "1234",
          }),
        }),
      };

      const newBill = new NewBill({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage,
      });

      const fileInput = screen.getByTestId("file");
      const file = new File(["dummy content"], "test.png", {
        type: "image/png",
      });

      // When
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Then
      await waitFor(() => {
        expect(newBill.fileUrl).toBe("https://localhost/image.jpg");
        expect(newBill.fileName).toBe("test.png");
      });
    });

    test("When I submit the form, it should call updateBill and navigate to Bills", async () => {
      // Given
      const html = NewBillUI();
      document.body.innerHTML = html;

      Object.defineProperty(window, "localStorage", {
        value: mockLocalStorage,
      });

      const onNavigate = jest.fn();
      const store = {
        bills: () => ({
          update: jest.fn().mockResolvedValue({}),
        }),
      };

      const newBill = new NewBill({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage,
      });

      // Remplir le formulaire
      fireEvent.change(screen.getByTestId("expense-type"), {
        target: { value: "Restaurants et bars" },
      });
      fireEvent.change(screen.getByTestId("expense-name"), {
        target: { value: "Repas client" },
      });
      fireEvent.change(screen.getByTestId("datepicker"), {
        target: { value: "2023-05-31" },
      });
      fireEvent.change(screen.getByTestId("amount"), {
        target: { value: "100" },
      });
      fireEvent.change(screen.getByTestId("vat"), {
        target: { value: "20" },
      });
      fireEvent.change(screen.getByTestId("pct"), {
        target: { value: "20" },
      });
      fireEvent.change(screen.getByTestId("commentary"), {
        target: { value: "Déjeuner avec client" },
      });

      newBill.fileUrl = "https://localhost/file.jpg";
      newBill.fileName = "file.jpg";

      const updateBillSpy = jest.spyOn(newBill, "updateBill");

      // When
      fireEvent.submit(screen.getByTestId("form-new-bill"));

      // Then
      await waitFor(() => {
        expect(updateBillSpy).toHaveBeenCalled();
        expect(onNavigate).toHaveBeenCalled();
      });
    });

    describe("When an error occurs on API", () => {
      test("create new bill from an API and fails with 500 message error", async () => {
        store.bills.mockImplementationOnce(() => ({
          create: () => Promise.reject(new Error("Erreur 500")),
        }));

        const html = NewBillUI();
        document.body.innerHTML = html;

        Object.defineProperty(window, "localStorage", {
          value: {
            getItem: jest.fn(() =>
              JSON.stringify({ email: "employee@test.com", type: "Employee" })
            ),
          },
        });

        const onNavigate = jest.fn();

        const newBill = new NewBill({
          document,
          onNavigate,
          store,
          localStorage: window.localStorage,
        });

        // Act - simulate file upload to trigger create() and the error
        const fileInput = screen.getByTestId("file");
        const file = new File(["dummy content"], "error.png", {
          type: "image/png",
        });
        fireEvent.change(fileInput, { target: { files: [file] } });

        // Assert
        await waitFor(() => {
          const errorMsg = screen.getByTestId("error-message");
          expect(errorMsg).toHaveTextContent("Erreur 500");
        });
      });
    });
  });
});
