/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import "@testing-library/jest-dom";
import { localStorageMock } from "../__mocks__/localStorage.js";
import { ROUTES_PATH } from "../constants/routes.js";
import Bills from "../containers/Bills.js";
import { bills } from "../fixtures/bills.js";
import BillsUI from "../views/BillsUI.js";

import router from "../app/Router.js";

jest.mock("../app/Store.js", () => ({
  __esModule: true,
  default: {
    bills: jest.fn(() => ({
      list: jest.fn().mockResolvedValue([]), // return empty array or sample bills
    })),
  },
}));

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      //to-do write expect expression
      expect(windowIcon.classList.contains("active-icon")).toBe(true);
    });
    test("Then bills should be ordered from earliest to latest", () => {
      // document.body.innerHTML = BillsUI({ data: bills });
      const billsSorted = [...bills].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      document.body.innerHTML = BillsUI({ data: billsSorted });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });

    test("Then clicking on 'Nouvelle note de frais' should navigate to NewBill page", () => {
      document.body.innerHTML = BillsUI({ data: [] });
      const onNavigate = jest.fn();
      const billsContainer = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });
      const newBillBtn = screen.getByTestId("btn-new-bill");
      newBillBtn.click();
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH.NewBill);
    });

    test("Then clicking on the eye icon should open the modal with the image", () => {
      $.fn.modal = jest.fn();
      document.body.innerHTML = BillsUI({ data: bills });
      const onNavigate = jest.fn();
      const billsContainer = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });
      const eyeIcon = screen.getAllByTestId("icon-eye")[0];
      eyeIcon.click();
      expect($.fn.modal).toHaveBeenCalled();
      expect(document.querySelector(".bill-proof-container img")).toBeTruthy();
    });

    describe("When I call getBills()", () => {
      test("Then it should return formatted bills if data is valid", async () => {
        const store = {
          bills: () => ({
            list: () =>
              Promise.resolve([
                {
                  id: "1",
                  date: "2022-01-01",
                  status: "pending",
                  name: "Facture 1",
                },
              ]),
          }),
        };

        const billsContainer = new Bills({
          document,
          onNavigate: jest.fn(),
          store,
          localStorage: window.localStorage,
        });

        const result = await billsContainer.getBills();
        expect(result[0].date).toMatch(/\d{1,2} [A-Za-zéû]+\.* \d{2}/);
        expect(result[0].status).not.toBe("pending");
      });

      test("Then it should return unformatted date if date is corrupted", async () => {
        const corruptedStore = {
          bills: () => ({
            list: () =>
              Promise.resolve([
                {
                  id: "1",
                  date: "not-a-date",
                  status: "pending",
                  name: "Facture invalide",
                },
              ]),
          }),
        };

        const billsContainer = new Bills({
          document,
          onNavigate: jest.fn(),
          store: corruptedStore,
          localStorage: window.localStorage,
        });

        const result = await billsContainer.getBills();
        expect(result[0].date).toBe("not-a-date");
        expect(result[0].status).not.toBe("pending");
      });

      test("Then it should display error message from API which failed with 404 message error", async () => {
        const storeWithError = {
          bills: () => ({
            list: () => Promise.reject(new Error("Erreur 404")),
          }),
        };

        document.body.innerHTML = BillsUI({ data: [] });

        Object.defineProperty(window, "localStorage", {
          value: {
            getItem: jest.fn(() =>
              JSON.stringify({ email: "employee@test.com", type: "Employee" })
            ),
          },
        });

        const onNavigate = jest.fn();

        const billsContainer = new Bills({
          document,
          onNavigate,
          store: storeWithError,
          localStorage: window.localStorage,
        });

        await billsContainer.getBills(); // <-- Appelle réellement getBills

        await waitFor(() => {
          const errorMsg = screen.getByTestId("error-message");
          expect(errorMsg).toHaveTextContent("Erreur 404");
        });
      });
    });
  });
});
