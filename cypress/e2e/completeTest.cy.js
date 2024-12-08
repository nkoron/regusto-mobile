describe('Mi aplicación Expo', () => {
    beforeEach(() => {
        cy.visit('http://localhost:8081/'); // Cambia a la URL correcta si es necesario
    });

    it('login test', () => {
        cy.get('[data-testid="Ingresar"]').click(); // Asegúrate de que tu botón tenga el testID adecuado
        cy.get('[data-testid="signUp"]').click();

        cy.get('[data-testid="signupEmailInput"]').type('nico@gmail.com', { force: true });
        cy.get('[data-testid="passwordInput"]').type('12345678', { force: true }); // Forzar la escritura en el campo de correo electrónico
        cy.get('[data-testid="confirmPassword"]').type('12345678', { force: true });
        cy.get('[data-testid="phone"]').scrollIntoView().type('37018689', { force: true });
        cy.get('[data-testid="name"]').type('test', { force: true });
        cy.get('[data-testid="surname"]').type('example', { force: true });
        cy.get('[data-testid="SignUpbutton"]').click();
        cy.get('[data-testid="loginSlide"]').click();
        cy.get('[data-testid="loginEmailInput"]').type('nicokoron8@gmail.com', { force: true });
        cy.get('[data-testid="loginPasswordInput"]').type('testing1', { force: true });
        cy.get('[data-testid="loginButton"]').click();
    });

    it('favorites test', () => {
        cy.get('[data-testid="Ingresar"]').click();
        cy.get('[data-testid="loginEmailInput"]').type('nicokoron8@gmail.com', { force: true });
        cy.get('[data-testid="loginPasswordInput"]').type('testing1', { force: true });
        cy.get('[data-testid="loginButton"]').click();
        cy.get('[data-testid="favoritesButton"]').first().click({ force: true});
        cy.wait(2000);
        cy.get('[data-testid="favoritesButton"]').should('have.css', 'color', 'rgb(255, 107, 107)');
        cy.get('[data-testid="favoritesButton"]').first().click({ force: true });
        cy.wait(2000);
        cy.get('[data-testid="favoritesButton"]').should('have.css', 'color', 'rgb(224, 224, 224)');
    });

    it('make order', () => {
        cy.get('[data-testid="Ingresar"]').click();
        cy.get('[data-testid="loginEmailInput"]').type('nicokoron8@gmail.com', { force: true });
        cy.get('[data-testid="loginPasswordInput"]').type('testing1', { force: true });
        cy.get('[data-testid="loginButton"]').click();
        cy.contains('span', 'Tiendas')
            .should('have.class', 'css-textHasAncestor-1jxf684')
            .and('have.class', 'r-maxWidth-dnmrzs')
            .and('have.class', 'r-overflow-1udh08x')
            .and('have.class', 'r-textOverflow-1udbk01')
            .and('have.class', 'r-whiteSpace-3s2u2q')
            .and('have.class', 'r-wordWrap-1iln25a')
            .and('have.class', 'r-backgroundColor-1niwhzg')
            .and('have.class', 'r-textAlign-q4m81j')
            .and('have.class', 'r-marginLeft-1joea0r')
            .and('have.class', 'r-marginTop-19qrga8')
            .and('have.attr', 'style', 'color: rgb(74, 74, 74); font-size: 12px; font-weight: 600;')
            .click({ force: true });
        cy.contains('div.css-text-146c3p1.r-fontSize-ubezar.r-fontWeight-vw2c0b', 'Disco')
            .click({ force: true });
        cy.contains('div.css-text-146c3p1.r-fontSize-ubezar.r-fontWeight-vw2c0b', 'PanLactal')
            .click({ force: true });
        cy.contains('div', '')
            .click({ force: true });

        cy.contains('div', 'Add to Cart')
            .parent()
            .click({ force: true });
        cy.contains('div.css-text-146c3p1.r-userSelect-lrvibr', '')
            .click({ force: true });
        cy.contains('div.css-text-146c3p1.r-color-jwli3a.r-fontSize-1i10wst.r-fontWeight-vw2c0b', 'Proceed to Checkout')
            .click({ force: true });
        cy.wait(2500);
        cy.contains('div.css-text-146c3p1.r-userSelect-lrvibr', '')
            .click({ force: true });
    });
    it("change data", () => {
        cy.get('[data-testid="Ingresar"]').click();
        cy.get('[data-testid="loginEmailInput"]').type('nicokoron8@gmail.com', {force: true});
        cy.get('[data-testid="loginPasswordInput"]').type('testing1', {force: true});
        cy.get('[data-testid="loginButton"]').click();
        cy.contains('span.css-textHasAncestor-1jxf684.r-userSelect-lrvibr', '')
            .click({force: true});
        cy.wait(2000);
        cy.get('[data-testid="editData"]').first().click({ force: true });
        cy.get('[data-testid="inputField"]').type('test', { force: true });
        cy.contains('div.css-text-146c3p1.r-color-jwli3a.r-fontSize-ubezar.r-fontWeight-vw2c0b', 'Submit Changes')
            .click({ force: true });
        cy.wait(1000);
        cy.get('[data-testid="logOut"]').click({ force: true });
        cy.get('div.css-view-175oi2r.r-transitionProperty-1i6wzkk.r-userSelect-lrvibr.r-cursor-1loqt21.r-touchAction-1otgn73.r-alignItems-1awozwy.r-borderRadius-1xfd6ze.r-padding-xyw6el.r-width-a1w0r5.r-backgroundColor-1u9a0t5')
            .contains('div.css-text-146c3p1.r-fontSize-ubezar.r-fontWeight-1kfrs79.r-color-jwli3a', 'Confirm')
            .click({ force: true });
    });
});